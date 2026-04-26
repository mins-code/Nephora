from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Import local logic
try:
    from extractor import CKDExtractor
    from predictor import CKDPredictor
except ImportError:
    from backend.extractor import CKDExtractor
    from backend.predictor import CKDPredictor

app = FastAPI(title="Nephora CKD Backend")

# Setup CORS - Critical for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core logic
extractor = CKDExtractor()
predictor = CKDPredictor()

# Ensure temp directory exists for PDF processing
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

class PredictRequest(BaseModel):
    visits: List[Dict[str, Any]]

@app.get("/health")
async def health_check():
    """Returns the health status of the API."""
    return {"status": "ok"}

@app.post("/extract")
async def extract_report_data(
    file: UploadFile = File(...),
    visit_date: Optional[str] = Form(default="")
):
    """
    Accepts a PDF blood report, extracts kidney biomarkers, and returns them.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save to temp folder with unique name
    temp_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract data
        results = extractor.extract_from_pdf(temp_path)
        
        # Add visit_date to the response
        results["visit_date"] = visit_date
        
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    
    finally:
        # Cleanup: remove temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/predict")
async def predict_risk(request: PredictRequest):
    """
    Accepts longitudinal visit data and returns CKD risk prediction and explanations.
    """
    try:
        # Get results from predictor
        results = predictor.predict(request.visits)
        
        # Augment results with extras requested in build spec
        results["n_visits"] = len(request.visits)
        results["creat_slope"] = results["feature_values"].get("creat_slope", 0.0)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
