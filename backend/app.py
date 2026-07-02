"""
APHELION AI Flask API.

Serves the Next.js Mission Control dashboard from the physics pipeline
(simulator -> Solar Behaviour Engine -> KDTree historical retrieval ->
XGBoost forecaster) via a single shared MissionState, so every endpoint
reports numbers consistent with the others. Run with:

    source backend/venv/bin/activate
    PYTHONPATH=backend FLASK_APP=backend/app.py flask run --port 5000

or simply `python backend/app.py`.
"""
from __future__ import annotations

import json
import math
import random
import time
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from behaviour.classification import classify_goes, class_letter, STATUS_BY_CLASS
from behaviour.engine import SolarBehaviourEngine
from forecast.dataset import CLASS_LABELS
from forecast.predictor import FlarePredictor
from retrieval.historical_archive import HISTORICAL_EVENTS
from retrieval.matcher import HistoricalMatcher
from simulation.flare_simulator import generate_flare, QUIET_SXR_BASELINE, QUIET_HXR_BASELINE
from state.mission_state import mission_state
from replay.real_data_loader import discover_real_events, load_event_series
from replay.real_fingerprint import compute_real_fingerprint
from replay.state import replay_state

METRICS_PATH = Path(__file__).resolve().parent / "outputs" / "models" / "flare_forecast_metrics.json"

app = Flask(__name__)
CORS(app)

mission_state.start()
replay_state.start()
_engine = SolarBehaviourEngine()


def _format_duration(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m}m"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


def _format_time_label(t: float) -> str:
    total = int(t)
    h = (total // 3600) % 24
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _default_fingerprint_dict() -> dict:
    return {
        "rise_velocity_kms": 0.0, "peak_ratio": 1.0, "cross_correlation": 0.0,
        "hxr_sxr_lag_s": 0.0, "thermal_decay_tau_s": 0.0, "event_duration_s": 0.0,
        "impulsiveness_index": 0.0, "goes_class": "A0.0", "status": "nominal",
    }


def _fingerprint_vector(fp_dict: dict) -> list[float]:
    from retrieval.historical_archive import FINGERPRINT_FIELDS
    return [fp_dict[f] for f in FINGERPRINT_FIELDS]


# --------------------------------------------------------------------- #
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "uptime_s": round(mission_state.uptime_seconds(), 1)})


@app.route("/api/telemetry/live")
def telemetry_live():
    window = int(request.args.get("window", 90))
    samples = mission_state.telemetry_window(window)
    points = [
        {"t": s.t, "time": _format_time_label(s.t), "soft": s.soft, "hard": s.hard}
        for s in samples
    ]
    latest = samples[-1] if samples else None
    return jsonify({
        "points": points,
        "now": {
            "soft": latest.soft if latest else 0.0,
            "hard": latest.hard if latest else 0.0,
            "goes_class": classify_goes(latest.soft) if latest else "A0.0",
        },
    })


@app.route("/api/telemetry/packets")
def telemetry_packets():
    limit = int(request.args.get("limit", 20))
    samples = mission_state.telemetry_window(limit)
    packets = []
    for i, s in enumerate(samples):
        letter = class_letter(classify_goes(s.soft))
        status = "critical" if letter == "X" else "warning" if letter in ("M", "C") else "nominal"
        packets.append({
            "id": f"pkt-sxr-{int(s.t)}",
            "time": _format_time_label(s.t),
            "payload": "SoLEXS",
            "parameter": "SXR_Flux_1_8A",
            "value": f"{s.soft:.3e} W/m²",
            "status": status,
        })
        packets.append({
            "id": f"pkt-hxr-{int(s.t)}",
            "time": _format_time_label(s.t),
            "payload": "HEL1OS",
            "parameter": "HXR_Flux_Proxy",
            "value": f"{s.hard:.3e} W/m²",
            "status": "nominal",
        })
    for _ in range(max(0, limit // 3)):
        hk = mission_state.housekeeping_packet()
        hk["id"] = f"pkt-hk-{random.randint(0, 10**9)}"
        hk["time"] = _format_time_label(samples[-1].t) if samples else "00:00:00"
        packets.append(hk)
    packets.sort(key=lambda p: p["id"])
    return jsonify({"packets": packets[-limit:]})


@app.route("/api/mission/status")
def mission_status():
    snap = mission_state.snapshot()
    letter = class_letter(snap.goes_class)
    overall_status = "NOMINAL" if letter in ("A", "B") else "WATCH" if letter == "C" else "ELEVATED"
    return jsonify({
        "status": overall_status,
        "goes_class": snap.goes_class,
        "downlink_packets": snap.packet_count,
        "link_margin_dbhz": round(96.5 + (hash(int(snap.now_sim_t)) % 40) / 10.0, 1),
        "health_index": snap.health_index,
        "payloads": {
            "SoLEXS": {"state": "Active", "duty_cycle_pct": 100},
            "HEL1OS": {"state": "Active", "duty_cycle_pct": 98},
            "ASPEX": {"state": "Standby", "duty_cycle_pct": 92},
            "PAPA": {"state": "Active", "duty_cycle_pct": 100},
        },
    })


@app.route("/api/health-index")
def health_index_route():
    snap = mission_state.snapshot()
    val = snap.health_index
    label = "Quiet" if val <= 30 else "Watch" if val <= 50 else "Warning" if val <= 75 else "Critical"
    return jsonify({"value": val, "label": label, "goes_class": snap.goes_class})


@app.route("/api/alerts")
def alerts_route():
    snap = mission_state.snapshot()
    alerts = [
        {
            "id": a.id, "title": a.title, "source": a.source, "severity": a.severity,
            "timestamp": time.strftime("%H:%M:%S", time.localtime(a.timestamp)),
            "description": a.description, "acknowledged": False,
        }
        for a in reversed(snap.alerts)
    ]
    return jsonify({"alerts": alerts})


@app.route("/api/behaviour/fingerprint")
def behaviour_fingerprint():
    snap = mission_state.snapshot()
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    history = snap.fingerprint_history

    def trend(key: str):
        h = history.get(key, [])
        if len(h) < 2:
            return "stable", 0.0
        delta = h[-1] - h[-2]
        if abs(delta) < 1e-9:
            return "stable", 0.0
        return ("up" if delta > 0 else "down"), delta

    metrics_meta = [
        ("hxr_sxr_lag_s", "HXR→SXR Lag", "s", 1,
         "Time delay between peak Hard X-ray and Soft X-ray emission (Neupert lag). Shorter lag indicates faster chromospheric evaporation."),
        ("rise_velocity_kms", "Rise Velocity", "km/s", 0,
         "Proxy velocity derived from the SXR flux rise gradient (not a direct Doppler measurement). Higher values correlate with more energetic impulsive phases."),
        ("cross_correlation", "Cross Correlation", "", 2,
         "Correlation between HXR flux and the SXR time-derivative. High correlation confirms standard Neupert-effect behaviour."),
        ("peak_ratio", "Peak Ratio", "", 2,
         "Ratio of peak Soft X-ray flux to peak Hard X-ray flux. Reflects thermal vs. non-thermal energy partition."),
        ("thermal_decay_tau_s", "Thermal Delay", "s", 0,
         "e-folding decay time constant of the SXR light curve, a proxy for combined conductive + radiative cooling of the flaring loop."),
        ("event_duration_s", "Event Duration", "s", 0,
         "Full width at half maximum (FWHM) of the current SXR burst above background."),
    ]

    metrics = []
    for key, name, unit, decimals, desc in metrics_meta:
        value = fp.get(key, 0.0)
        tr, delta = trend(key)
        metrics.append({
            "key": key, "name": name,
            "value": round(value, decimals) if decimals else round(value),
            "unit": unit,
            "trend": tr,
            "trend_val": round(delta, decimals) if decimals else round(delta),
            "status": fp.get("status", "nominal"),
            "description": desc,
            "history": history.get(key, []),
        })

    return jsonify({"metrics": metrics, "goes_class": fp.get("goes_class"), "status": fp.get("status")})


def _current_feature_vector(snap) -> list[float]:
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    return _fingerprint_vector(fp)


@app.route("/api/forecast/timeline")
def forecast_timeline():
    if mission_state.predictor is None:
        return jsonify({"error": "Forecast model not trained. Run backend/forecast/train_model.py"}), 503

    snap = mission_state.snapshot()
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    vector = _fingerprint_vector(fp)
    tau = fp.get("thermal_decay_tau_s", 0.0)

    blocks = []
    for label, minutes in [("5 min", 5), ("10 min", 10), ("30 min", 30), ("1 hour", 60)]:
        horizon = mission_state.predictor.predict_horizon(vector, tau, minutes)
        letter = horizon["predicted_class_letter"]
        blocks.append({
            "leadTime": label,
            "expectedClass": f"{letter}-class ({horizon['probability']:.0f}% P)",
            "probability": horizon["probability"],
            "confidence": horizon["confidence"],
            "status": STATUS_BY_CLASS.get(letter, "nominal"),
            "reason": f"Projected from current fingerprint (τ={tau:.0f}s decay) using physics-based relaxation toward baseline.",
        })
    return jsonify({"blocks": blocks})


@app.route("/api/forecast/run", methods=["POST", "GET"])
def forecast_run():
    if mission_state.predictor is None:
        return jsonify({"error": "Forecast model not trained. Run backend/forecast/train_model.py"}), 503

    payload = request.get_json(silent=True) or {}
    region_id = (payload.get("region_id") or request.args.get("region_id") or "AR00000").upper()

    # Deterministic-per-region synthetic observation: same AR id always
    # reproduces the same simulated telemetry, so repeated runs feel real
    # rather than re-randomizing on every click.
    seed = int.from_bytes(region_id.encode()[:8].ljust(8, b"0"), "little") % (2**31)
    rng = random.Random(seed)
    flare = generate_flare(rng, t_start=0.0)

    t_end = flare.t_peak_sxr + 4 * flare.tau_decay_sxr
    n = max(40, int(t_end / 5.0))
    import numpy as np
    t = np.linspace(0, t_end, n)
    soft = QUIET_SXR_BASELINE + np.array([flare.sxr_flux(tt) for tt in t]) * (1 + 0.03 * rng.gauss(0, 1))
    hard = QUIET_HXR_BASELINE + np.array([flare.hxr_flux(tt) for tt in t]) * (1 + 0.05 * rng.gauss(0, 1))

    fp = _engine.compute(t, soft, hard)
    vector = _fingerprint_vector(fp.as_dict())
    forecast = mission_state.predictor.predict(vector)
    matches = mission_state.matcher.query(vector, k=1)

    return jsonify({
        "region_id": region_id,
        "fingerprint": fp.as_dict(),
        "forecast": {
            "predicted_class": forecast.predicted_class_letter,
            "class_probabilities": forecast.class_probabilities,
            "probability_m_or_above": forecast.probability_m_or_above,
            "confidence": forecast.confidence,
            "lead_time_minutes": forecast.lead_time_minutes,
            "attribution": forecast.attribution,
        },
        "closest_historical_match": {
            "id": matches[0].event.id, "goes_class": matches[0].event.goes_class,
            "similarity_pct": matches[0].similarity_pct,
        } if matches else None,
    })


@app.route("/api/history/events")
def history_events():
    snap = mission_state.snapshot()
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    vector = _fingerprint_vector(fp)
    matches = {m.event.id: m.similarity_pct for m in mission_state.matcher.query(vector, k=len(HISTORICAL_EVENTS))}

    events = []
    for e in HISTORICAL_EVENTS:
        events.append({
            "id": e.id, "date": e.date, "goesClass": e.goes_class,
            "peakFlux": f"{e.peak_flux_wm2:.2e} W/m²",
            "duration": _format_duration(e.duration_s),
            "lag": f"{e.hxr_sxr_lag_s:.0f}s",
            "similarity": matches.get(e.id, 0.0),
            "desc": e.desc,
            "dataSource": e.data_source,
        })
    events.sort(key=lambda x: x["similarity"], reverse=True)
    return jsonify({"events": events})


@app.route("/api/history/similar")
def history_similar():
    snap = mission_state.snapshot()
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    vector = _fingerprint_vector(fp)
    matches = mission_state.matcher.query(vector, k=1)
    if not matches:
        return jsonify({"error": "No historical archive available"}), 503
    match = matches[0]
    event = match.event

    def normalized_curve(n=24):
        # reconstruct a smooth GRED-shaped profile from the stored
        # duration/tau of the archived event, for the mini comparison plot
        peak_i = n // 3
        vals = []
        for i in range(n):
            if i <= peak_i:
                vals.append(math.exp(-((i - peak_i) ** 2) / (2 * (peak_i / 2 + 0.5) ** 2)))
            else:
                vals.append(math.exp(-(i - peak_i) / max(n / 6, 1)))
        return vals

    current_samples = mission_state.telemetry_window(24)
    if current_samples:
        soft_vals = [s.soft for s in current_samples]
        lo, hi = min(soft_vals), max(soft_vals)
        current_curve = [((v - lo) / (hi - lo) if hi > lo else 0.0) for v in soft_vals]
    else:
        current_curve = normalized_curve()

    return jsonify({
        "current": {
            "id": "SOL-LIVE", "goes_class": fp.get("goes_class"),
            "peak_flux": f"{max((s.soft for s in current_samples), default=0.0):.2e} W/m²",
            "rise_duration": f"{fp.get('event_duration_s', 0):.0f}s",
            "lag": f"{fp.get('hxr_sxr_lag_s', 0):.0f}s",
            "curve": current_curve,
        },
        "match": {
            "id": event.id, "date": event.date, "goes_class": event.goes_class,
            "peak_flux": f"{event.peak_flux_wm2:.2e} W/m²",
            "rise_duration": f"{event.event_duration_s:.0f}s",
            "lag": f"{event.hxr_sxr_lag_s:.0f}s",
            "curve": normalized_curve(),
        },
        "similarity_pct": match.similarity_pct,
        "data_source": event.data_source,
    })


def _build_reasoning(fp: dict, top_attribution: list) -> str:
    """
    Compose a physics reasoning sentence from whichever features SHAP
    actually found most important for THIS prediction - rather than a
    fixed narrative that always cites the same two features regardless of
    what really drove the model's output.
    """
    clauses = {
        "cross_correlation": lambda: (
            f"a Neupert-effect cross-correlation of {fp.get('cross_correlation', 0):.2f} between HXR flux "
            f"and the SXR time-derivative"
        ),
        "hxr_sxr_lag_s": lambda: f"a {fp.get('hxr_sxr_lag_s', 0):.0f}s HXR→SXR (Neupert) lag",
        "rise_velocity_kms": lambda: f"an SXR rise-gradient proxy of {fp.get('rise_velocity_kms', 0):.0f} km/s",
        "peak_ratio": lambda: f"a peak SXR/HXR flux ratio of {fp.get('peak_ratio', 0):.2f}",
        "thermal_decay_tau_s": lambda: f"a {fp.get('thermal_decay_tau_s', 0):.0f}s thermal decay time constant",
        "event_duration_s": lambda: f"an event duration (FWHM) of {fp.get('event_duration_s', 0):.0f}s",
        "impulsiveness_index": lambda: f"an HXR impulsiveness index of {fp.get('impulsiveness_index', 0):.2e}",
    }

    parts = [clauses[a["feature"]]() for a in top_attribution if a["feature"] in clauses]
    if not parts:
        return "Model prediction driven by the current behaviour fingerprint (see attribution weights above)."

    signal_text = " and ".join(parts)
    return (
        f"The model's prediction is dominated by {signal_text} — together accounting for "
        f"{sum(a['contribution_pct'] for a in top_attribution):.0f}% of this prediction's SHAP attribution."
    )


@app.route("/api/explain")
def explain():
    if mission_state.predictor is None:
        return jsonify({"error": "Forecast model not trained. Run backend/forecast/train_model.py"}), 503

    snap = mission_state.snapshot()
    fp = snap.fingerprint.as_dict() if snap.fingerprint else _default_fingerprint_dict()
    vector = _fingerprint_vector(fp)
    result = mission_state.predictor.predict(vector)

    top = result.attribution[:2]
    reasoning = _build_reasoning(fp, top) if top else "Insufficient telemetry to compute physics attribution yet."

    return jsonify({
        "predicted_class": result.predicted_class_letter,
        "confidence": round(result.confidence * 100, 1),
        "lead_time_minutes": result.lead_time_minutes,
        "headline": f"Forecast: {fp.get('goes_class')} Flare {'Imminent' if fp.get('status') == 'critical' else 'Possible'}",
        "attribution": result.attribution,
        "reasoning": reasoning,
        "model_name": "APHELION-XGB-v1 (physics-fingerprint classifier)",
        "explainability_method": "SHAP TreeExplainer (Lundberg & Lee 2017) — real per-prediction attribution, not scripted text",
    })


@app.route("/api/metrics")
def metrics_route():
    if not METRICS_PATH.exists():
        return jsonify({"error": "No trained model metrics found. Run backend/forecast/train_model.py"}), 503
    metrics = json.loads(METRICS_PATH.read_text())
    grid = [
        {"id": "acc", "name": "Prediction Accuracy", "value": metrics["accuracy"], "suffix": "%", "decimals": 1},
        {"id": "lead", "name": "Median Lead Time", "value": metrics.get("median_lead_time_minutes", 0), "suffix": "m", "decimals": 0, "isTime": True},
        {"id": "prec", "name": "Model Precision", "value": metrics["precision"], "suffix": "%", "decimals": 1},
        {"id": "rec", "name": "Model Recall", "value": metrics["recall"], "suffix": "%", "decimals": 1},
        {"id": "far", "name": "False Alarm Rate", "value": metrics["false_alarm_rate"], "suffix": "%", "decimals": 2},
        {"id": "tpr", "name": "True Positive Rate", "value": metrics["true_positive_rate"], "suffix": "%", "decimals": 1},
    ]
    return jsonify({"grid": grid, "raw": metrics})


# --------------------------------------------------------------------- #
# Real-event replay (backend/replay/) - scrubs through actual downlinked
# SoLEXS/HEL1OS archives placed in backend/data/raw/, independent of the
# live simulator above. See replay/real_fingerprint.py for why this never
# reports a GOES class: the underlying counts are uncalibrated.

@app.route("/api/replay/events")
def replay_events():
    events = discover_real_events()
    return jsonify({
        "events": [
            {
                "event_id": e.event_id,
                "peak_counts": round(e.peak_counts, 1),
                "mean_counts": round(e.mean_counts, 1),
                "has_dual_channel": e.has_dual_channel,
            }
            for e in events
        ],
        "note": "peak_counts/mean_counts are raw SoLEXS detector count rates, not calibrated flux.",
    })


@app.route("/api/replay/telemetry")
def replay_telemetry():
    event_id = request.args.get("event")
    if not event_id:
        return jsonify({"error": "event query param required, e.g. ?event=2026-06-23"}), 400
    try:
        window, full_series = replay_state.window(event_id)
    except KeyError:
        return jsonify({"error": f"Unknown event_id: {event_id}"}), 404

    points = [
        {
            "t": float(row.timestamp),
            "soft": float(row.soft),
            "hard": None if math.isnan(row.hard) else float(row.hard),
        }
        for row in window.itertuples(index=False)
    ]
    progress_pct = round(100.0 * replay_state.position(event_id) / max(len(full_series), 1), 1)
    return jsonify({"points": points, "progress_pct": progress_pct, "total_samples": len(full_series)})


@app.route("/api/replay/fingerprint")
def replay_fingerprint():
    event_id = request.args.get("event")
    if not event_id:
        return jsonify({"error": "event query param required, e.g. ?event=2026-06-23"}), 400
    try:
        window, full_series = replay_state.window(event_id)
    except KeyError:
        return jsonify({"error": f"Unknown event_id: {event_id}"}), 404

    try:
        fp = compute_real_fingerprint(event_id, window, full_series["soft"].to_numpy())
    except ValueError as e:
        return jsonify({"error": str(e)}), 503

    return jsonify(fp.as_dict())


if __name__ == "__main__":
    # 5000 collides with macOS AirPlay Receiver on many machines; 5050 avoids it.
    app.run(host="0.0.0.0", port=5050, debug=False, use_reloader=False)
