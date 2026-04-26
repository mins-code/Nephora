import joblib
import numpy as np
import pandas as pd
import shap
import os

class CKDPredictor:
    def __init__(self, model_dir=None):
        # Default model_dir to the 'models' folder in the same directory as this file
        if model_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.join(base_dir, "models")
            
        self.model = joblib.load(os.path.join(model_dir, "ckd_model_xgb.pkl"))
        self.scaler = joblib.load(os.path.join(model_dir, "scaler.pkl"))
        self.feature_cols = joblib.load(os.path.join(model_dir, "feature_cols.pkl"))
        self.explainer = shap.TreeExplainer(self.model)
        
        # Training medians — fill missing features with these
        # Computed from scaler's min/max midpoints as approximation
        self.medians = {
            col: (self.scaler.data_min_[i] + self.scaler.data_max_[i]) / 2
            for i, col in enumerate(self.feature_cols)
        }

    def build_feature_vector(self, visits: list) -> pd.DataFrame:
        """
        visits: list of dicts, each dict = one report's extracted biomarkers
        Each dict has keys: Creatinine, BUN, Potassium, Sodium,
                            Hemoglobin, Bicarbonate, Calcium, Glucose
        Each value is the extracted float, or None if not found.
        """
        features = {}
        TESTS = ['BUN', 'Bicarbonate', 'Calcium', 'Creatinine',
                 'Glucose', 'Hemoglobin', 'Potassium', 'Sodium']
        
        for test in TESTS:
            values = [v[test] for v in visits if v.get(test) is not None]
            
            if not values:
                # Not found in any report — use training median
                features[f'mean_val_{test}'] = self.medians.get(f'mean_val_{test}', 0)
                features[f'max_val_{test}'] = self.medians.get(f'max_val_{test}', 0)
                features[f'ever_abnormal_{test}'] = 0
            else:
                features[f'mean_val_{test}'] = np.mean(values)
                features[f'max_val_{test}'] = np.max(values)
                
                # Classify abnormal using ref ranges from all visits
                any_abnormal = 0
                for v in visits:
                    val = v.get(test)
                    ref_low = v.get(f'{test}_ref_low')
                    ref_high = v.get(f'{test}_ref_high')
                    if val is not None and ref_low is not None and ref_high is not None:
                        if val < ref_low or val > ref_high:
                            any_abnormal = 1
                features[f'ever_abnormal_{test}'] = any_abnormal
        
        # Creatinine slope
        creat_values = [v['Creatinine'] for v in visits if v.get('Creatinine') is not None]
        if len(creat_values) >= 2:
            x = np.arange(len(creat_values))
            features['creat_slope'] = float(np.polyfit(x, creat_values, 1)[0])
        else:
            features['creat_slope'] = 0.0
        
        # Build DataFrame in exact column order
        df = pd.DataFrame([features])
        # Add any missing columns from feature_cols (shouldn't happen with exact match, but for safety)
        for col in self.feature_cols:
            if col not in df.columns:
                df[col] = self.medians.get(col, 0)
                
        df = df[self.feature_cols]  # CRITICAL: enforce exact order
        return df

    def predict(self, visits: list) -> dict:
        df = self.build_feature_vector(visits)
        X_scaled = self.scaler.transform(df)
        
        # Get probability for the positive class (CKD)
        prob = float(self.model.predict_proba(X_scaled)[0][1])
        
        # SHAP explanation
        shap_values = self.explainer.shap_values(X_scaled)
        # TreeExplainer might return a list of arrays for multiclass or just an array for binary
        # For XGBoost binary classification, it usually returns a single array or a list [prob_0, prob_1]
        if isinstance(shap_values, list):
            # Use SHAP values for class 1
            vals = shap_values[1][0]
        else:
            vals = shap_values[0]
            
        shap_dict = {
            col: float(vals[i])
            for i, col in enumerate(self.feature_cols)
        }
        
        return {
            "risk_probability": round(prob * 100, 1),
            "risk_label": "High" if prob > 0.65 else "Moderate" if prob > 0.35 else "Low",
            "risk_color": "red" if prob > 0.65 else "amber" if prob > 0.35 else "green",
            "shap_values": shap_dict,
            "feature_values": df.iloc[0].to_dict()
        }
