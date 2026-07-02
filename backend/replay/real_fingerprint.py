"""
Honest behaviour fingerprint for REAL (uncalibrated) SoLEXS/HEL1OS data.

Reuses the same shape-based physics primitives as
backend/behaviour/engine.py (FWHM, log-linear decay fit, lag
cross-correlation - all scale-invariant, so they're valid on raw counts)
but deliberately does NOT compute a GOES class or a "rise velocity in
km/s": both of those require physically calibrated W/m^2 flux, which raw
detector counts are not. Instead this reports units honestly (counts/sec)
and an activity_percentile computed relative to that day's own
distribution, so the numbers can't be mistaken for calibrated,
cross-comparable-with-the-simulator output.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional

import numpy as np
import pandas as pd

from behaviour.engine import fwhm, decay_tau, best_lag_cross_correlation

ACTIVITY_BANDS = [
    (99.5, "Extreme"),
    (95.0, "Active"),
    (80.0, "Elevated"),
    (0.0, "Quiet"),
]


def _activity_label(percentile: float) -> str:
    for threshold, label in ACTIVITY_BANDS:
        if percentile >= threshold:
            return label
    return "Quiet"


@dataclass
class RealEventFingerprint:
    event_id: str
    has_dual_channel: bool
    peak_counts: float
    background_counts: float
    activity_percentile: float
    activity_label: str
    sxr_rise_gradient_counts_per_s: float
    thermal_decay_tau_s: float
    event_duration_s: float
    peak_ratio: Optional[float]
    cross_correlation: Optional[float]
    hxr_sxr_lag_s: Optional[float]
    hxr_impulsiveness_counts_per_s: Optional[float]
    calibration_note: str = (
        "Derived from raw, uncalibrated SoLEXS/HEL1OS detector count rates - "
        "no GOES class or physical velocity is reported here, since that requires "
        "instrument effective-area/gain calibration not present in these product files."
    )

    def as_dict(self) -> dict:
        return asdict(self)


def compute_real_fingerprint(event_id: str, window: pd.DataFrame, full_day_soft: np.ndarray) -> RealEventFingerprint:
    """
    `window` is a slice of the event's [timestamp, soft, hard] series (the
    region currently being replayed/inspected). `full_day_soft` is the
    complete day's soft-channel series, used only to rank this window's
    peak against the day's own distribution (activity_percentile) - never
    against the simulator's or another day's absolute scale, since raw
    counts aren't comparable across different observation conditions.
    """
    if len(window) < 8:
        raise ValueError("Need at least 8 samples to compute a real-data fingerprint")

    t = window["timestamp"].to_numpy(dtype=float)
    soft = window["soft"].to_numpy(dtype=float)
    hard = window["hard"].to_numpy(dtype=float)
    has_dual_channel = not np.all(np.isnan(hard))

    dt = float(np.median(np.diff(t))) or 1.0
    background = float(np.percentile(soft, 5))
    peak_soft = float(soft.max())

    activity_percentile = float((full_day_soft < peak_soft).mean() * 100)

    d_soft = np.gradient(soft, t)
    peak_idx = int(np.argmax(soft))
    rise_grad = float(np.max(d_soft[: max(peak_idx, 1)])) if peak_idx > 0 else float(np.max(d_soft))

    tau = decay_tau(t, soft, background)
    duration = fwhm(t, soft, background)

    peak_ratio = cross_correlation = hxr_sxr_lag_s = impulsiveness = None
    if has_dual_channel:
        peak_hard = float(np.nanmax(hard))
        peak_ratio = round(peak_soft / max(peak_hard, 1e-9), 3)
        lag_s, corr = best_lag_cross_correlation(hard, d_soft, dt)
        cross_correlation = round(abs(corr), 3)
        hxr_sxr_lag_s = round(lag_s, 1)

        hard_peak_idx = int(np.nanargmax(hard))
        hard_bg = float(np.nanpercentile(hard, 5))
        onset_thresh = hard_bg + (peak_hard - hard_bg) * 0.1
        onset_candidates = np.where(hard[:max(hard_peak_idx, 1)] <= onset_thresh)[0]
        onset_idx = int(onset_candidates[-1]) if len(onset_candidates) else 0
        hxr_rise_time = max(float(t[hard_peak_idx] - t[onset_idx]), dt)
        impulsiveness = round(peak_hard / hxr_rise_time, 3)

    return RealEventFingerprint(
        event_id=event_id,
        has_dual_channel=has_dual_channel,
        peak_counts=round(peak_soft, 1),
        background_counts=round(background, 1),
        activity_percentile=round(activity_percentile, 1),
        activity_label=_activity_label(activity_percentile),
        sxr_rise_gradient_counts_per_s=round(max(0.0, rise_grad), 3),
        thermal_decay_tau_s=round(tau, 1),
        event_duration_s=round(duration, 1),
        peak_ratio=peak_ratio,
        cross_correlation=cross_correlation,
        hxr_sxr_lag_s=hxr_sxr_lag_s,
        hxr_impulsiveness_counts_per_s=impulsiveness,
    )
