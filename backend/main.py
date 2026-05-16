import os
import logging
import traceback
import shutil
import uuid
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ── Load env vars (GROQ_API_KEY etc.) ────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("nephora.api")

# ── CKD predictor / extractor (existing) ─────────────────────────────────────
from extractor import CKDExtractor
from predictor import CKDPredictor

# ── Chatbot engine (new) ──────────────────────────────────────────────────────
chat_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global chat_engine
    logger.info("[STARTUP] Loading CKD Predictor + Extractor...")

    try:
        from chat_engine import ClinicalChatEngine
        chat_engine = ClinicalChatEngine()
        logger.info("[STARTUP] ✓ Nephora AI (ClinicalChatEngine) initialized.")
    except Exception:
        logger.error(f"[STARTUP] ✗ ClinicalChatEngine failed to load:\n{traceback.format_exc()}")
        chat_engine = None

    yield

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Nephora CKD Backend", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Singleton services ────────────────────────────────────────────────────────
extractor = CKDExtractor()
predictor = CKDPredictor()

TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# ════════════════════════════════════════════════════════════
# Pydantic models
# ════════════════════════════════════════════════════════════

class PredictRequest(BaseModel):
    visits: List[Dict[str, Any]]

class ChatRequest(BaseModel):
    query: str
    session_id: str = "default_session"
    # Optional: pass already-extracted visit data so the AI can reason over it
    # without requiring a second upload.
    visits: Optional[List[Dict[str, Any]]] = None

class ChatResponse(BaseModel):
    answer: str

# ════════════════════════════════════════════════════════════
# Existing routes — /health, /extract, /predict
# ════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    ai_status = "active" if chat_engine and chat_engine.llm else "inactive"
    return {
        "status": "ok",
        "nephora_ai": ai_status,
    }

@app.post("/extract")
async def extract_report_data(
    file: UploadFile = File(...),
    visit_date: Optional[str] = Form(default="")
):
    """Accepts a PDF blood report, extracts kidney biomarkers, returns them."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        results = extractor.extract_from_pdf(temp_path)
        results["visit_date"] = visit_date
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/predict")
async def predict_risk(request: PredictRequest):
    """Accepts longitudinal visit data and returns CKD risk prediction + SHAP explanations."""
    try:
        results = predictor.predict(request.visits)
        results["n_visits"] = len(request.visits)
        results["creat_slope"] = results["feature_values"].get("creat_slope", 0.0)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# ════════════════════════════════════════════════════════════
# New routes — Nephora AI Chat (/chat, /ai/*)
# ════════════════════════════════════════════════════════════

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main Nephora AI chat endpoint.

    If `visits` are provided in the request body, the AI reasons directly over
    the already-extracted biomarker data (Option A — no second upload needed).
    Otherwise it falls back to the session-based timeline stored on disk.
    """
    if not chat_engine:
        return ChatResponse(answer="⚠️ Nephora AI engine is not initialized. Please restart the backend.")

    if not request.query.strip():
        return ChatResponse(answer="Please ask me something about your kidney health.")

    try:
        # If the frontend passes visit data directly, inject it into the engine
        # so the AI can answer questions about the current patient's biomarkers.
        if request.visits:
            result = chat_engine.chat_with_visits(request.query, request.visits)
        else:
            result = chat_engine.chat(request.query, request.session_id)

        return ChatResponse(answer=result["answer"])
    except Exception:
        logger.error(f"[CHAT] Error:\n{traceback.format_exc()}")
        return ChatResponse(answer="An unexpected error occurred. Please try again.")

@app.post("/ai/upload")
async def ai_upload(session_id: str, files: List[UploadFile] = File(...)):
    """Upload PDFs for AI session ingestion (optional — if user wants to chat without /extract flow)."""
    if not chat_engine:
        raise HTTPException(status_code=500, detail="Nephora AI engine offline.")
    try:
        results = chat_engine.ingest_upload(session_id, files)
        return {"message": f"Processed {len(files)} report(s).", "patients": results["patients"], "session_id": session_id}
    except Exception:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="AI ingestion failed.")

@app.get("/ai/timeline")
async def ai_timeline(session_id: str):
    if not chat_engine:
        raise HTTPException(status_code=500, detail="Nephora AI engine offline.")
    return chat_engine.get_timeline(session_id)

@app.get("/ai/dashboard")
async def ai_dashboard(session_id: str):
    if not chat_engine:
        raise HTTPException(status_code=500, detail="Nephora AI engine offline.")
    return chat_engine.get_dashboard_data(session_id)

# ════════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
