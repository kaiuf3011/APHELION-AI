"""
Trains the flare-class forecaster and persists it (+ evaluation metrics +
a SHAP explainer) for the Flask API to load at request time.

IMPORTANT (read before trusting the numbers this prints): the training and
test sets are both drawn from the physics-informed synthetic generator in
dataset.py, not from real Aditya-L1 observations - see that module's
docstring for why. The accuracy/precision/recall figures below are real,
honestly measured on a held-out split the model never saw during training,
but they describe how well XGBoost can recover flare class from behaviour
fingerprints under our simulated flare model, not real-world skill. They
should be read as "the model correctly learns the physics relationships we
encoded" rather than "the model forecasts the real Sun at 94% accuracy".
Retraining against a real labeled SoLEXS/HEL1OS event catalog, once one
exists, is a drop-in replacement: swap generate_dataset() for a loader over
real fingerprints and rerun this script.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
import shap
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from behaviour.classification import CLASS_RANK
from forecast.dataset import generate_dataset, CLASS_LABELS, FEATURE_NAMES


def _lead_time_minutes(predicted_letter: str, confidence: float) -> float:
    """Same heuristic as FlarePredictor.predict() - duplicated here (rather
    than imported) because FlarePredictor requires an already-trained model
    file to construct, which doesn't exist yet during this training run."""
    severity_rank = CLASS_RANK[predicted_letter]
    return max(2.0, 45.0 - severity_rank * 8.0 - confidence * 15.0)

MODEL_DIR = Path(__file__).resolve().parent.parent / "outputs" / "models"
MODEL_PATH = MODEL_DIR / "flare_forecast_xgb.joblib"
METRICS_PATH = MODEL_DIR / "flare_forecast_metrics.json"

N_EXAMPLES = 9000
RANDOM_STATE = 42


def train(n_examples: int = N_EXAMPLES, random_state: int = RANDOM_STATE) -> dict:
    t0 = time.time()
    X, y = generate_dataset(n_examples, seed=random_state)
    gen_seconds = time.time() - t0

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )

    model = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="multi:softprob",
        num_class=len(CLASS_LABELS),
        eval_metric="mlogloss",
        random_state=random_state,
    )
    t0 = time.time()
    model.fit(X_train, y_train)
    train_seconds = time.time() - t0

    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted", zero_division=0
    )

    # False alarm rate: fraction of test examples the model called M/X
    # ("actionable" high-severity classes) when the true outcome was <= C.
    high_pred = np.isin(y_pred, [CLASS_LABELS.index("M"), CLASS_LABELS.index("X")])
    low_true = np.isin(y_test, [CLASS_LABELS.index("A"), CLASS_LABELS.index("B"), CLASS_LABELS.index("C")])
    false_alarm_rate = float((high_pred & low_true).sum() / max(low_true.sum(), 1))

    # True positive rate for M/X (the operationally critical classes)
    high_true = np.isin(y_test, [CLASS_LABELS.index("M"), CLASS_LABELS.index("X")])
    true_positive_rate = float((high_pred & high_true).sum() / max(high_true.sum(), 1))

    cm = confusion_matrix(y_test, y_pred, labels=list(range(len(CLASS_LABELS)))).tolist()

    proba_test = model.predict_proba(X_test)
    actionable_mask = np.isin(y_pred, [CLASS_LABELS.index("M"), CLASS_LABELS.index("X")])
    lead_times = [
        _lead_time_minutes(CLASS_LABELS[p], float(proba_test[i, p]))
        for i, p in enumerate(y_pred) if actionable_mask[i]
    ]
    median_lead_time = float(np.median(lead_times)) if lead_times else 0.0

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_names": FEATURE_NAMES, "class_labels": CLASS_LABELS}, MODEL_PATH)

    metrics = {
        "data_source": "physics-informed synthetic (Gaussian-rise/exponential-decay flare model); "
                        "see backend/forecast/dataset.py and backend/forecast/train_model.py docstrings",
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "generation_seconds": round(gen_seconds, 2),
        "training_seconds": round(train_seconds, 2),
        "accuracy": round(accuracy * 100, 2),
        "precision": round(precision * 100, 2),
        "recall": round(recall * 100, 2),
        "f1": round(f1 * 100, 2),
        "false_alarm_rate": round(false_alarm_rate * 100, 2),
        "true_positive_rate": round(true_positive_rate * 100, 2),
        "median_lead_time_minutes": round(median_lead_time, 1),
        "class_labels": CLASS_LABELS,
        "confusion_matrix": cm,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    train()
