"""
Physics-informed synthetic training set generator for the flare forecaster.

APHELION AI has no labeled historical Aditya-L1 flare catalog to train on
(the mission has been operating only since late 2023 and this repository
ships no raw telemetry archives). Rather than fabricate fake "real" data,
we generate training examples from the same physically-motivated flare
model used to drive the live demo (backend/simulation/flare_simulator.py)
and extract features with the exact same Solar Behaviour Engine used at
inference time (backend/behaviour/engine.py) - so the model is trained and
queried on identically-computed features, and its evaluation metrics are
real (measured on a held-out synthetic split), even though the underlying
events are simulated rather than observed. This is disclosed to the user
via /api/metrics `data_source`.

Each example simulates "catching" a flare at a random point in its
evolution (anywhere from early rise to full decay) and asks: given only
the behaviour fingerprint computable from data observed so far, what GOES
class will this event ultimately reach? This mirrors real nowcasting far
better than classifying already-completed events.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np

from behaviour.classification import classify_goes, class_letter
from behaviour.engine import SolarBehaviourEngine
from simulation.flare_simulator import (
    FlareEvent, generate_flare, QUIET_SXR_BASELINE, QUIET_HXR_BASELINE,
)

CLASS_LABELS = ["A", "B", "C", "M", "X"]
FEATURE_NAMES = [
    "rise_velocity_kms",
    "peak_ratio",
    "cross_correlation",
    "hxr_sxr_lag_s",
    "thermal_decay_tau_s",
    "event_duration_s",
    "impulsiveness_index",
]


def _sample_balanced_flare(rng: random.Random) -> FlareEvent:
    """
    Unlike the live simulator (which samples flare size from a realistic,
    strongly B/C-skewed power-law via sample_flare_class), training
    generation samples the target GOES class roughly uniformly so the
    classifier sees enough large-flare examples to learn to discriminate
    them. The FlareEvent itself is still built by generate_flare(), so both
    the live demo and the trainer share one physical model.
    """
    letter = rng.choice(CLASS_LABELS)
    bounds = {
        "A": (2e-8, 1e-7), "B": (1e-7, 1e-6), "C": (1e-6, 1e-5),
        "M": (1e-5, 1e-4), "X": (1e-4, 6e-4),
    }[letter]
    sxr_amplitude = 10 ** rng.uniform(np.log10(bounds[0]), np.log10(bounds[1]))
    return generate_flare(rng, t_start=0.0, sxr_amplitude=sxr_amplitude)


@dataclass
class TrainingExample:
    features: list[float]
    label: str
    observed_fraction: float  # how far into the event this snapshot was taken (0-1+)


def generate_example(rng: random.Random, engine: SolarBehaviourEngine) -> TrainingExample | None:
    flare = _sample_balanced_flare(rng)
    dt = 5.0
    t_end = flare.t_peak_sxr + 6 * flare.tau_decay_sxr
    t = np.arange(0.0, t_end, dt)
    soft = QUIET_SXR_BASELINE + np.array([flare.sxr_flux(tt) for tt in t])
    hard = QUIET_HXR_BASELINE + np.array([flare.hxr_flux(tt) for tt in t])

    # instrument-like shot noise
    soft = soft * (1.0 + np.array([rng.gauss(0, 0.04) for _ in t]))
    hard = hard * (1.0 + np.array([rng.gauss(0, 0.07) for _ in t]))
    soft = np.clip(soft, 1e-10, None)
    hard = np.clip(hard, 1e-11, None)

    # "now" snapshot: anywhere from mid-rise to well past peak
    earliest = flare.t_peak_sxr - 1.5 * flare.sigma_rise_sxr
    latest = flare.t_peak_sxr + 4 * flare.tau_decay_sxr
    now = rng.uniform(max(earliest, dt * 8), max(latest, dt * 8))
    now_idx = int(np.searchsorted(t, now))
    if now_idx < 8:
        return None

    lookback = 240  # 20 minutes of rolling buffer at dt=5s
    start_idx = max(0, now_idx - lookback)
    window_t, window_soft, window_hard = t[start_idx:now_idx], soft[start_idx:now_idx], hard[start_idx:now_idx]
    if len(window_t) < 8:
        return None

    try:
        fp = engine.compute(window_t, window_soft, window_hard)
    except ValueError:
        return None

    final_label = class_letter(classify_goes(QUIET_SXR_BASELINE + flare.sxr_amplitude))
    observed_fraction = float(now_idx * dt) / max(flare.t_peak_sxr, 1.0)

    return TrainingExample(
        features=[
            fp.rise_velocity_kms, fp.peak_ratio, fp.cross_correlation, fp.hxr_sxr_lag_s,
            fp.thermal_decay_tau_s, fp.event_duration_s, fp.impulsiveness_index,
        ],
        label=final_label,
        observed_fraction=observed_fraction,
    )


def generate_dataset(n_examples: int, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    rng = random.Random(seed)
    engine = SolarBehaviourEngine()
    X, y = [], []
    attempts = 0
    while len(X) < n_examples and attempts < n_examples * 4:
        attempts += 1
        ex = generate_example(rng, engine)
        if ex is None:
            continue
        X.append(ex.features)
        y.append(CLASS_LABELS.index(ex.label))
    return np.array(X, dtype=float), np.array(y, dtype=int)
