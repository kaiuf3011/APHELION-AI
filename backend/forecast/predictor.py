"""
Inference wrapper around the trained XGBoost flare-class forecaster, plus
real SHAP-based feature attribution for the Explainable AI panel.

This intentionally does not build a chatbot / "fake AI" explanation. SHAP
(SHapley Additive exPlanations, Lundberg & Lee 2017) values quantify, for
one specific prediction, how much each of the 7 behaviour-fingerprint
features pushed the model's output away from its baseline - a standard,
model-agnostic explainability technique, not scripted text.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import shap

from behaviour.classification import CLASS_RANK
from forecast.dataset import CLASS_LABELS, FEATURE_NAMES

MODEL_PATH = Path(__file__).resolve().parent.parent / "outputs" / "models" / "flare_forecast_xgb.joblib"

FEATURE_LABELS = {
    "rise_velocity_kms": "SXR Rise Gradient (velocity proxy)",
    "peak_ratio": "SXR/HXR Peak Ratio",
    "cross_correlation": "Neupert Cross-Correlation",
    "hxr_sxr_lag_s": "HXR->SXR Lag",
    "thermal_decay_tau_s": "Thermal Decay Constant",
    "event_duration_s": "Event Duration (FWHM)",
    "impulsiveness_index": "HXR Impulsiveness Index",
}


@dataclass
class ForecastResult:
    predicted_class_letter: str
    class_probabilities: dict  # letter -> probability (0-1)
    probability_m_or_above: float
    probability_x: float
    confidence: float
    attribution: list  # [{feature, label, shap_value, contribution_pct}]
    lead_time_minutes: float


class FlarePredictor:
    def __init__(self, model_path: Path = MODEL_PATH):
        if not model_path.exists():
            raise FileNotFoundError(
                f"No trained model at {model_path}. Run `python backend/forecast/train_model.py` first."
            )
        bundle = joblib.load(model_path)
        self.model = bundle["model"]
        self.feature_names = bundle["feature_names"]
        self.class_labels = bundle["class_labels"]
        self.explainer = shap.TreeExplainer(self.model)

    def predict(self, feature_vector: list[float]) -> ForecastResult:
        x = np.array([feature_vector], dtype=float)
        proba = self.model.predict_proba(x)[0]
        class_probabilities = {label: float(p) for label, p in zip(self.class_labels, proba)}

        predicted_idx = int(np.argmax(proba))
        predicted_letter = self.class_labels[predicted_idx]
        confidence = float(proba[predicted_idx])

        m_idx, x_idx = CLASS_LABELS.index("M"), CLASS_LABELS.index("X")
        probability_m_or_above = float(proba[m_idx] + proba[x_idx])
        probability_x = float(proba[x_idx])

        shap_values = self.explainer.shap_values(x)
        # multi-class TreeExplainer returns shape (1, n_features, n_classes) in
        # recent SHAP versions, or a list of per-class arrays in older ones.
        sv = np.asarray(shap_values)
        if sv.ndim == 3:
            class_shap = sv[0, :, predicted_idx]
        else:  # list-of-arrays form: sv[class][sample, feature]
            class_shap = np.asarray(shap_values[predicted_idx])[0]

        total_abs = float(np.sum(np.abs(class_shap))) or 1.0
        attribution = sorted(
            [
                {
                    "feature": name,
                    "label": FEATURE_LABELS.get(name, name),
                    "shap_value": round(float(val), 6),
                    "contribution_pct": round(100.0 * abs(float(val)) / total_abs, 1),
                }
                for name, val in zip(self.feature_names, class_shap)
            ],
            key=lambda d: d["contribution_pct"],
            reverse=True,
        )

        # Lead-time heuristic: higher-severity, higher-confidence predictions
        # imply the event is already further along its impulsive phase, so
        # forecast lead time shrinks with both severity rank and confidence.
        severity_rank = CLASS_RANK[predicted_letter]
        lead_time_minutes = max(2.0, 45.0 - severity_rank * 8.0 - confidence * 15.0)

        return ForecastResult(
            predicted_class_letter=predicted_letter,
            class_probabilities=class_probabilities,
            probability_m_or_above=round(probability_m_or_above, 4),
            probability_x=round(probability_x, 4),
            confidence=round(confidence, 4),
            attribution=attribution,
            lead_time_minutes=round(lead_time_minutes, 1),
        )

    def predict_horizon(self, feature_vector: list[float], tau_decay_s: float, horizon_minutes: float) -> dict:
        """
        The classifier only ever sees a single snapshot fingerprint - it has
        no learned notion of "what happens next". Rather than pretend
        otherwise, we extrapolate forward by relaxing the current prediction
        toward a quiet-Sun baseline prediction, at a rate set by the fitted
        thermal decay time constant of the CURRENT event (tau_decay_s):
        events with a fast-decaying SXR profile are expected to fade
        quickly, so confidence in continued elevation drops faster with
        lead time than for a slow, long-duration event. This is an explicit
        physically-motivated decay heuristic, not a learned temporal model.
        """
        base = self.predict(feature_vector)
        tau = max(tau_decay_s, 300.0)
        decay_factor = float(np.exp(-(horizon_minutes * 60.0) / tau))

        quiet_vector = [0.0, 1.0, 0.05, 0.0, 0.0, 0.0, 0.0]
        quiet = self.predict(quiet_vector)

        blended = {
            label: base.class_probabilities[label] * decay_factor
            + quiet.class_probabilities[label] * (1 - decay_factor)
            for label in self.class_labels
        }
        total = sum(blended.values()) or 1.0
        blended = {k: v / total for k, v in blended.items()}

        predicted_letter = max(blended, key=blended.get)
        probability = blended[predicted_letter]

        return {
            "predicted_class_letter": predicted_letter,
            "probability": round(probability * 100, 1),
            "confidence": round((decay_factor * base.confidence + (1 - decay_factor) * quiet.confidence) * 100, 1),
            "class_probabilities": {k: round(v, 4) for k, v in blended.items()},
        }
