import os
import re
import json
import logging
import shutil
from datetime import datetime
from typing import List

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from services.biomarker_parser import extract_biomarkers
from services.trend_engine import calculate_trends, generate_alerts

logger = logging.getLogger("nephora.engine")
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data", "sessions")

def extract_patient_info(text: str) -> dict:
    name_match = re.search(r'(?i)Name\s*[:\-]?\s*(?:Mr\.|Mrs\.|Ms\.)?\s*([A-Za-z\s]{3,20})(?:\n|\r|\t|UH ID)', text)
    name = name_match.group(1).strip().title() if name_match else "Unknown Patient"
    name = re.sub(r'[^A-Za-z\s]', '', name).strip()
    if not name: name = "Unknown Patient"
    
    age_match = re.search(r'(?i)Age\s*[:\-]?\s*(\d+)', text)
    age = int(age_match.group(1)) if age_match else 50
    
    gender_match = re.search(r'(?i)(?:Sex|Gender)\s*[:\-]?\s*(Male|Female|M|F)', text)
    gender = "Male"
    if gender_match:
        g_str = gender_match.group(1).upper()
        if "F" in g_str:
            gender = "Female"
            
    return {"name": name, "age": age, "gender": gender}

def split_reports_by_date(text: str) -> list:
    date_pattern = r'(?i)(?:Reported On|Collected On|Date)\s*[:\-]?\s*([\d]{2}-[A-Za-z]{3}-[\d]{4}|[\d]{2}/[\d]{2}/[\d]{4})'
    matches = list(re.finditer(date_pattern, text))
    if not matches:
        return [(datetime.today().strftime("%Y-%m-%d"), text)]
        
    reports = []
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
        
        date_str = matches[i].group(1).strip()
        try:
            dt = datetime.strptime(date_str, "%d-%b-%Y") if "-" in date_str else datetime.strptime(date_str, "%d/%m/%Y")
            f_date = dt.strftime("%Y-%m-%d")
        except ValueError:
            f_date = datetime.today().strftime("%Y-%m-%d")
            
        reports.append((f_date, text[start_idx:end_idx]))
        
    merged = {}
    for d, t in reports:
        if d in merged:
            merged[d] += "\n" + t
        else:
            merged[d] = t
            
    # Sort chronologically
    sorted_reports = sorted([(k, v) for k, v in merged.items()], key=lambda x: x[0])
    return sorted_reports

def determine_ckd_stage(egfr: float) -> str:
    if egfr >= 90: return "Stage 1 (Normal/High)"
    elif egfr >= 60: return "Stage 2 (Mild)"
    elif egfr >= 45: return "Stage 3a (Mild-Moderate)"
    elif egfr >= 30: return "Stage 3b (Moderate-Severe)"
    elif egfr >= 15: return "Stage 4 (Severe)"
    else: return "Stage 5 (Kidney Failure)"

class ClinicalChatEngine:
    def __init__(self):
        logger.info("Initializing Structured ClinicalChatEngine...")
        os.makedirs(DATA_DIR, exist_ok=True)
        
        api_key = os.getenv("GROQ_API_KEY", "")
        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
            api_key=api_key,
            max_retries=0,
            timeout=15,
        ) if api_key else None

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Nephora, an empathetic clinical intelligence assistant for kidney disease monitoring.

Your goal is to answer the user's specific questions about their clinical data.
DO NOT dump raw JSON or use robotic extraction-style lists. Never mention "JSON", "backend", or "system messages".
If the user asks for a summary, provide a concise, conversational clinical summary.
Otherwise, directly and dynamically answer their specific question using the data provided.

CRITICAL INSTRUCTIONS:
1. Greet the patient naturally if they say hello.
2. If discussing their overall health, weave their CKD Stage and eGFR into the narrative.
3. If discussing specific biomarkers, explain what they mean for kidney health (e.g., why is Potassium high?).
4. Compare recent values to previous values if history is available.
5. Keep responses extremely concise, strictly focused on the user's prompt, and supportive.

Patient Clinical Data:
{timeline}

Active Critical Alerts:
{alerts}"""),
            ("human", "{input}")
        ])

    def ingest_upload(self, session_id: str, files: List[UploadFile]) -> dict:
        session_dir = os.path.join(DATA_DIR, session_id)
        os.makedirs(session_dir, exist_ok=True)
        reports_dir = os.path.join(session_dir, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        patient_histories = {}
        
        for file in files:
            file_path = os.path.join(reports_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            
            full_text = "\n".join([d.page_content for d in docs])
            
            patient_info = extract_patient_info(full_text)
            p_name = patient_info["name"]
            report_chunks = split_reports_by_date(full_text)
            
            if p_name not in patient_histories:
                patient_histories[p_name] = []
                
            for r_date, chunk_text in report_chunks:
                bios = extract_biomarkers(chunk_text, patient_info["age"], patient_info["gender"])
                if bios: # Only log visit if biomarkers were successfully extracted
                    ckd_stage = determine_ckd_stage(bios["eGFR"]["value"]) if "eGFR" in bios else None
                    patient_histories[p_name].append({
                        "date": r_date,
                        "file_name": file.filename,
                        "ckd_stage": ckd_stage,
                        "biomarkers": bios
                    })
            
        timeline_file = os.path.join(session_dir, "timeline.json")
        for p, history in patient_histories.items():
            history.sort(key=lambda x: x["date"])
            
        with open(timeline_file, 'w') as f:
            json.dump(patient_histories, f, indent=4)
            
        return {"patients": list(patient_histories.keys())}

    def get_timeline(self, session_id: str) -> dict:
        t_file = os.path.join(DATA_DIR, session_id, "timeline.json")
        if os.path.exists(t_file):
            with open(t_file, 'r') as f: return json.load(f)
        return {}

    def get_dashboard_data(self, session_id: str) -> dict:
        timeline = self.get_timeline(session_id)
        if not timeline: return {}
        
        dashboard = {}
        for p, history in timeline.items():
            trends = calculate_trends(history)
            alerts = generate_alerts(history[-1] if history else {}, trends)
            dashboard[p] = {
                "history": history,
                "trends": trends,
                "alerts": alerts
            }
        return dashboard

    def chat(self, query: str, session_id: str) -> dict:
        import time
        t0 = time.time()
        logger.info(f"[CHAT] Received query for session {session_id}")
        
        timeline_data = self.get_dashboard_data(session_id)
        if not timeline_data:
            return {"answer": "No patient timeline data found. Please upload clinical reports."}
            
        logger.info(f"[CHAT] Timeline data retrieved in {time.time() - t0:.2f}s")
            
        if not self.llm:
            return {"answer": "Backend reasoning engine is temporarily offline. Please view the dashboard."}

        try:
            t_llm = time.time()
            logger.info("[CHAT] Starting Groq clinical reasoning call...")
            t_str = json.dumps(timeline_data, indent=2)
            alerts = []
            for p, d in timeline_data.items():
                alerts.extend(d["alerts"])
                
            messages = self.prompt.format_messages(
                timeline=t_str,
                alerts="\n".join(alerts) if alerts else "None",
                input=query
            )
            response = self.llm.invoke(messages)
            logger.info(f"[CHAT] Groq call completed in {time.time() - t_llm:.2f}s")
            logger.info(f"[CHAT] Total response time: {time.time() - t0:.2f}s")
            return {"answer": response.content}
        except Exception as e:
            error_msg = str(e).lower()
            import traceback
            logger.error(f"[CHAT] LLM Generation failed after {time.time() - t0:.2f}s: {e}")
            logger.error(f"[CHAT] Full traceback:\n{traceback.format_exc()}")
            
            # Deterministic Fallback to prevent freezing
            reason = "experiencing high traffic (API Quota Exceeded)" if "429" in error_msg else "offline or timing out"
            fallback_ans = f"The AI conversational engine is {reason}. Here is your structured clinical summary instead:\n\n"
            for p, d in timeline_data.items():
                fallback_ans += f"**Patient:** {p}\n"
                for alert in d.get("alerts", []):
                    fallback_ans += f"⚠️ {alert}\n"
                latest = d["history"][-1] if d["history"] else {}
                if latest:
                    fallback_ans += f"\nLatest Report Date: {latest.get('date', 'Unknown')}\n"
                    for k, v in latest.get("biomarkers", {}).items():
                        fallback_ans += f"• {k}: {v['value']} {v['unit']} ({v['status']})\n"
                
            return {"answer": fallback_ans}

    def chat_with_visits(self, query: str, visits: list) -> dict:
        """
        Option A: Reason directly over already-extracted biomarker data from the
        frontend DiagnosticContext, converting it into the timeline dict the Groq
        prompt expects. No second upload required.
        """
        import time, traceback as tb
        t0 = time.time()
        logger.info(f"[CHAT] chat_with_visits called with {len(visits)} visit(s)")

        if not self.llm:
            return {"answer": "Nephora AI reasoning engine is temporarily offline."}

        BIOMARKERS = ["Creatinine", "BUN", "Potassium", "Sodium",
                      "Hemoglobin", "Bicarbonate", "Calcium", "Glucose"]

        history = []
        for v in visits:
            bios = {}
            for bm in BIOMARKERS:
                val = v.get(bm)
                if val is not None:
                    ref_low = v.get(f"{bm}_ref_low")
                    ref_high = v.get(f"{bm}_ref_high")
                    if ref_low is not None and ref_high is not None:
                        status = "abnormal" if (val < ref_low or val > ref_high) else "normal"
                    else:
                        status = "unknown"
                    bios[bm] = {"value": val, "unit": "", "status": status}
            history.append({"date": v.get("visit_date", ""), "biomarkers": bios})

        trends = calculate_trends(history)
        alerts = generate_alerts(history[-1] if history else {}, trends)

        timeline_data = {
            "Patient": {"history": history, "trends": trends, "alerts": alerts}
        }

        try:
            t_str = json.dumps(timeline_data, indent=2)
            messages = self.prompt.format_messages(
                timeline=t_str,
                alerts="\n".join(alerts) if alerts else "None",
                input=query,
            )
            response = self.llm.invoke(messages)
            logger.info(f"[CHAT] chat_with_visits completed in {time.time() - t0:.2f}s")
            return {"answer": response.content}
        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"[CHAT] chat_with_visits LLM error: {e}\n{tb.format_exc()}")
            reason = "experiencing high traffic (API quota exceeded)" if "429" in error_msg else "temporarily offline"
            fallback = f"⚠️ Nephora AI is {reason}. Here's a quick summary:\n\n"
            for alert in alerts:
                fallback += f"• {alert}\n"
            if history:
                latest = history[-1]
                fallback += f"\n**Latest visit ({latest['date']}):**\n"
                for bm, data in latest["biomarkers"].items():
                    fallback += f"• {bm}: {data['value']} ({data['status']})\n"
            return {"answer": fallback}
