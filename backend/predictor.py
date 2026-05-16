import joblib
import numpy as np
import pandas as pd
import shap
import os
import logging

logger = logging.getLogger("nephora.predictor")

# LSTM biomarker feature order (must match training order)
LSTM_FEATURES = ['BUN', 'Bicarbonate', 'Calcium', 'Creatinine',
                 'Glucose', 'Hemoglobin', 'Potassium', 'Sodium']

# Number of visits the LSTM was trained on
LSTM_SEQ_LEN = 3


class CKDPredictor:
    def __init__(self, model_dir=None):
        # Default model_dir to the 'models' folder in the same directory as this file
        if model_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.join(base_dir, "models")

        # ── XGBoost ───────────────────────────────────────────────────────────
        self.model = joblib.load(os.path.join(model_dir, "ckd_model_xgb.pkl"))
        self.scaler = joblib.load(os.path.join(model_dir, "scaler.pkl"))
        self.feature_cols = joblib.load(os.path.join(model_dir, "feature_cols.pkl"))
        self.explainer = shap.TreeExplainer(self.model)

        # Training medians — fill missing features with these
        self.medians = {
            col: (self.scaler.data_min_[i] + self.scaler.data_max_[i]) / 2
            for i, col in enumerate(self.feature_cols)
        }

        # ── LSTM ──────────────────────────────────────────────────────────────
        self.lstm_model = None
        self.seq_scaler = None
        lstm_path = os.path.join(model_dir, "ckd_model_lstm.keras")
        scaler_path = os.path.join(model_dir, "seq_scaler.pkl")
        try:
            import tensorflow as tf
            self.lstm_model = tf.keras.models.load_model(lstm_path)
            self.seq_scaler = joblib.load(scaler_path)
            logger.info("[PREDICTOR] ✓ LSTM model loaded successfully.")
        except Exception as e:
            logger.warning(f"[PREDICTOR] LSTM model could not be loaded: {e}. Falling back to XGBoost-only.")

    # ── XGBoost feature engineering ──────────────────────────────────────────

    def build_feature_vector(self, visits: list) -> pd.DataFrame:
        """
        visits: list of dicts, each dict = one report's extracted biomarkers.
        Each dict has keys: Creatinine, BUN, Potassium, Sodium,
                            Hemoglobin, Bicarbonate, Calcium, Glucose
        """
        features = {}
        TESTS = ['BUN', 'Bicarbonate', 'Calcium', 'Creatinine',
                 'Glucose', 'Hemoglobin', 'Potassium', 'Sodium']

        for test in TESTS:
            values = [v[test] for v in visits if v.get(test) is not None]

            if not values:
                features[f'mean_val_{test}'] = self.medians.get(f'mean_val_{test}', 0)
                features[f'max_val_{test}'] = self.medians.get(f'max_val_{test}', 0)
                features[f'ever_abnormal_{test}'] = 0
            else:
                features[f'mean_val_{test}'] = np.mean(values)
                features[f'max_val_{test}'] = np.max(values)

                any_abnormal = 0
                for v in visits:
                    val = v.get(test)
                    ref_low = v.get(f'{test}_ref_low')
                    ref_high = v.get(f'{test}_ref_high')
                    if val is not None and ref_low is not None and ref_high is not None:
                        if val < ref_low or val > ref_high:
                            any_abnormal = 1
                features[f'ever_abnormal_{test}'] = any_abnormal

        # Creatinine slope across visits
        creat_values = [v['Creatinine'] for v in visits if v.get('Creatinine') is not None]
        if len(creat_values) >= 2:
            x = np.arange(len(creat_values))
            features['creat_slope'] = float(np.polyfit(x, creat_values, 1)[0])
        else:
            features['creat_slope'] = 0.0

        df = pd.DataFrame([features])
        for col in self.feature_cols:
            if col not in df.columns:
                df[col] = self.medians.get(col, 0)

        df = df[self.feature_cols]  # CRITICAL: enforce exact order
        return df

    # ── LSTM sequence builder ─────────────────────────────────────────────────

    def build_lstm_sequence(self, visits: list) -> np.ndarray:
        """
        Build a (1, LSTM_SEQ_LEN, 8) sequence from the visits list.
        Uses the last LSTM_SEQ_LEN visits; pads with zeros at the front if fewer.
        Each timestep is the mean value of each of the 8 LSTM_FEATURES.
        """
        # For each visit, extract one value per LSTM feature (or 0 if missing)
        frames = []
        for v in visits:
            row = []
            for feat in LSTM_FEATURES:
                val = v.get(feat)
                row.append(float(val) if val is not None else 0.0)
            frames.append(row)

        # Keep only the last LSTM_SEQ_LEN visits
        if len(frames) > LSTM_SEQ_LEN:
            frames = frames[-LSTM_SEQ_LEN:]

        # Pad at front with zeros if fewer visits than LSTM_SEQ_LEN
        while len(frames) < LSTM_SEQ_LEN:
            frames.insert(0, [0.0] * len(LSTM_FEATURES))

        seq = np.array(frames, dtype=np.float32)  # (LSTM_SEQ_LEN, 8)

        # Scale using the fitted seq_scaler (fitted on shape (N, 8))
        seq_flat = seq.reshape(-1, len(LSTM_FEATURES))       # (LSTM_SEQ_LEN, 8)
        seq_scaled = self.seq_scaler.transform(seq_flat)     # (LSTM_SEQ_LEN, 8)
        seq_scaled = seq_scaled.reshape(1, LSTM_SEQ_LEN, len(LSTM_FEATURES))  # (1, 3, 8)
        return seq_scaled

    # ── LSTM prediction ───────────────────────────────────────────────────────

    def predict_lstm(self, visits: list) -> dict | None:
        """Return LSTM risk dict or None if model not available."""
        if self.lstm_model is None or self.seq_scaler is None:
            return None
        try:
            seq = self.build_lstm_sequence(visits)
            prob = float(self.lstm_model.predict(seq, verbose=0)[0][0])
            return {
                "lstm_risk_probability": round(prob * 100, 1),
                "lstm_risk_label": "High" if prob > 0.65 else "Moderate" if prob > 0.35 else "Low",
                "lstm_risk_color": "red" if prob > 0.65 else "amber" if prob > 0.35 else "green",
            }
        except Exception as e:
            logger.error(f"[PREDICTOR] LSTM inference failed: {e}")
            return None

    # ── Combined prediction ───────────────────────────────────────────────────

    def predict(self, visits: list) -> dict:
        # XGBoost path
        df = self.build_feature_vector(visits)
        X_scaled = self.scaler.transform(df)
        prob = float(self.model.predict_proba(X_scaled)[0][1])

        # SHAP explanation
        shap_values = self.explainer.shap_values(X_scaled)
        if isinstance(shap_values, list):
            vals = shap_values[1][0]
        else:
            vals = shap_values[0]

        shap_dict = {
            col: float(vals[i])
            for i, col in enumerate(self.feature_cols)
        }

        positive_shap = {k: v for k, v in shap_dict.items() if v > 0}
        top_driver_feature = max(positive_shap, key=positive_shap.get) if positive_shap else None
        top_driver = (
            top_driver_feature
            .replace('mean_val_', '')
            .replace('max_val_', '')
            .replace('ever_abnormal_', '')
            .replace('creat_slope', 'Creatinine Slope')
            if top_driver_feature else None
        )

        result = {
            "risk_probability": round(prob * 100, 1),
            "risk_label": "High" if prob > 0.65 else "Moderate" if prob > 0.35 else "Low",
            "risk_color": "red" if prob > 0.65 else "amber" if prob > 0.35 else "green",
            "shap_values": shap_dict,
            "feature_values": df.iloc[0].to_dict(),
            "top_driver": top_driver,
            "n_visits": len(visits),
            "creat_slope": df.iloc[0].get("creat_slope", 0.0),
        }

        # LSTM path (appended to same result dict)
        lstm_result = self.predict_lstm(visits)
        if lstm_result:
            result.update(lstm_result)
        else:
            result["lstm_risk_probability"] = None
            result["lstm_risk_label"] = None
            result["lstm_risk_color"] = None

        return result
