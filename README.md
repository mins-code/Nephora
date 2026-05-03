# Nephora: AI-Driven Chronic Kidney Disease (CKD) Diagnostic Platform

Nephora is a comprehensive clinical diagnostic tool designed to assist healthcare professionals in early detection, monitoring, and risk assessment of Chronic Kidney Disease (CKD). By leveraging machine learning and automated medical report extraction, Nephora transforms raw biomarker data into actionable longitudinal insights.

## 🚀 Key Features

- **Automated Report Extraction**: Integrates `PyMuPDF` to parse clinical blood reports (PDFs) and extract critical biomarkers such as Serum Creatinine, BUN, Potassium, Sodium, Hemoglobin, Bicarbonate, Calcium, and Glucose.
- **Longitudinal Prediction Engine**: Utilizes an XGBoost-based machine learning pipeline to analyze patient history and predict CKD progression risks.
- **Explainable AI (XAI)**: Implements SHAP (SHapley Additive exPlanations) to provide clinical transparency, showing exactly how each biomarker contributes to the risk score.
- **Dynamic Diagnostic Flow**: A multi-stage interface for uploading reports, verifying extracted data, and exploring deep-dive biomarker analytics.
- **Biomarker Pathway Analysis**: Visualizes the relationship between different renal indicators and their impact on patient health over time.

## 🛠️ Technical Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **OCR/Extraction**: PyMuPDF (fitz)
- **Machine Learning**: Scikit-learn, XGBoost, SHAP
- **Data Handling**: Pandas, NumPy
- **Server**: Uvicorn

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **API Client**: Axios

## 📂 Project Structure

```text
Nephora/
├── backend/                # FastAPI Application
│   ├── models/             # Trained ML models (.joblib)
│   ├── extractor.py        # PDF Parsing & Biomarker Extraction logic
│   ├── predictor.py        # ML Prediction & SHAP explanation logic
│   ├── main.py             # API Entry point & Routes
│   └── requirements.txt    # Python dependencies
├── frontend/               # React Application
│   ├── src/
│   │   ├── context/        # Global state (DiagnosticContext)
│   │   ├── pages/          # Main views (Upload, Analysis, Results)
│   │   ├── components/     # UI Components
│   │   └── utils/          # API services & helpers
│   └── package.json        # Node.js dependencies
└── README.md
```

## ⚙️ Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## 🔌 API Endpoints (Brief)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check. |
| `/extract` | `POST` | Upload PDF blood report for biomarker extraction. |
| `/predict` | `POST` | Submit longitudinal visit data for CKD risk analysis. |

---

Developed for clinical accuracy and high-performance renal diagnostics.
