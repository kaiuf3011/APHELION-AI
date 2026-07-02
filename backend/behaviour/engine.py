"""
Solar Behaviour Engine (SBE).

Computes a 7-dimensional physics-derived "behaviour fingerprint" from a
window of synchronized SXR/HXR telemetry, instead of feeding raw flux
arrays into a black-box model. Each feature ties back to an established
solar-flare diagnostic:

  1. rise_velocity_kms   - impulsive-phase SXR rise steepness, expressed as
                            a velocity-like proxy (see note below - this is
                            NOT a direct Doppler measurement).
  2. peak_ratio           - peak SXR flux / peak HXR flux (thermal vs.
                            non-thermal energy partition).
  3. cross_correlation    - Pearson correlation between HXR(t) and
                            d(SXR)/dt at the best-fit lag; how well the
                            event obeys the Neupert Effect (Neupert 1968).
  4. hxr_sxr_lag_s        - the lag (seconds) that maximizes that
                            correlation; classic "Neupert lag" used in
                            time-lag analyses (Dennis & Zarro 1993;
                            Veronig et al. 2002, A&A 392:699).
  5. thermal_decay_tau_s  - e-folding decay time of the SXR light curve
                            after peak, fit as F(t) ~ exp(-t/tau); a proxy
                            for the combined conductive + radiative
                            cooling timescale of the flaring loop.
  6. event_duration_s     - full width at half maximum (FWHM) of the SXR
                            burst above the local background.
  7. impulsiveness_index  - peak HXR flux / HXR rise time; how "spiky" the
                            non-thermal impulsive phase is.

Note on rise_velocity_kms: true plasma upflow velocity during
chromospheric evaporation requires Doppler spectroscopy, which SoLEXS/
HEL1OS broadband photometry does not provide. We instead report a
heuristic proxy velocity, linearly scaled from the normalized SXR flux
gradient so that typical evaporation-driven upflows (order 100-500 km/s,
per e.g. Milligan & Dennis 2009, ApJ 699:968) fall in a physically
sensible range. This is explicitly a proxy, not a measured velocity, and
is documented as such in the API response.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional

import numpy as np

from .classification import classify_goes, class_letter, STATUS_BY_CLASS

# Calibration constant for the rise-velocity proxy (see module docstring).
# Chosen so a "typical" M-class impulsive rise (~1e-6 W/m^2/s normalized
# gradient) maps to ~300 km/s, within the Milligan & Dennis (2009) range.
RISE_VELOCITY_SCALE_KMS = 3.0e8


@dataclass
class BehaviourFingerprint:
    rise_velocity_kms: float
    peak_ratio: float
    cross_correlation: float
    hxr_sxr_lag_s: float
    thermal_decay_tau_s: float
    event_duration_s: float
    impulsiveness_index: float
    goes_class: str
    status: str

    def as_dict(self) -> dict:
        return asdict(self)


def fwhm(t: np.ndarray, y: np.ndarray, background: float) -> float:
    peak = y.max()
    half = background + (peak - background) / 2.0
    above = np.where(y >= half)[0]
    if len(above) < 2:
        return 0.0
    return float(t[above[-1]] - t[above[0]])


MAX_PLAUSIBLE_TAU_S = 3600.0  # 1 hour; larger than any real GOES-catalog flare decay


def decay_tau(t: np.ndarray, y: np.ndarray, background: float) -> float:
    """Fit y(t) ~ background + A*exp(-(t-t_peak)/tau) on the post-peak segment
    via linear regression of ln(y - background) vs t. Requires a reasonably
    clean log-linear fit (R^2 >= 0.5) before trusting the extrapolated tau,
    otherwise the fit is dominated by noise (e.g. a quiet-Sun window with no
    real decaying event) and can blow up to physically implausible values."""
    peak_idx = int(np.argmax(y))
    seg_t = t[peak_idx:]
    seg_y = y[peak_idx:] - background
    seg_y = np.clip(seg_y, 1e-15, None)
    valid = seg_y > (seg_y[0] * 0.02)  # trim the noisy far tail
    if valid.sum() < 3:
        return 0.0
    seg_t, seg_y = seg_t[valid], seg_y[valid]
    log_y = np.log(seg_y)
    slope, intercept = np.polyfit(seg_t - seg_t[0], log_y, 1)
    if slope >= 0:
        return 0.0

    fitted = slope * (seg_t - seg_t[0]) + intercept
    ss_res = float(np.sum((log_y - fitted) ** 2))
    ss_tot = float(np.sum((log_y - log_y.mean()) ** 2)) or 1e-12
    r_squared = 1.0 - ss_res / ss_tot
    if r_squared < 0.5:
        return 0.0

    return float(min(-1.0 / slope, MAX_PLAUSIBLE_TAU_S))


def best_lag_cross_correlation(hard: np.ndarray, d_soft: np.ndarray, dt: float, max_lag_s: float = 120.0):
    """
    Cross-correlate HXR(t) against d(SXR)/dt across a bounded lag window and
    return (best_lag_seconds, correlation_at_best_lag). Positive lag means
    HXR leads (peaks before) the SXR derivative, as expected under the
    Neupert Effect.
    """
    n = len(hard)
    max_lag_samples = max(1, min(int(max_lag_s / dt), n // 2))

    def zscore(a: np.ndarray) -> np.ndarray:
        std = a.std()
        if std < 1e-30:
            return np.zeros_like(a)
        return (a - a.mean()) / std

    h = zscore(hard)
    s = zscore(d_soft)

    best_corr, best_lag = 0.0, 0
    for lag in range(-max_lag_samples, max_lag_samples + 1):
        # Positive lag tests the hypothesis "h[i] aligns with s[i + lag]",
        # i.e. HXR at time t predicts d(SXR)/dt at time t + lag*dt -> HXR
        # leads by lag*dt seconds when lag > 0.
        if lag > 0:
            a, b = h[: n - lag], s[lag:]
        elif lag < 0:
            a, b = h[-lag:], s[: n + lag]
        else:
            a, b = h, s
        if len(a) < 5:
            continue
        corr = float(np.dot(a, b) / len(a))
        if abs(corr) > abs(best_corr):
            best_corr, best_lag = corr, lag

    return best_lag * dt, best_corr


class SolarBehaviourEngine:
    """Computes a BehaviourFingerprint from a rolling telemetry window."""

    def compute(self, t: np.ndarray, soft: np.ndarray, hard: np.ndarray,
                background_soft: Optional[float] = None) -> BehaviourFingerprint:
        if len(t) < 8:
            raise ValueError("Need at least 8 samples to compute a behaviour fingerprint")

        dt = float(np.median(np.diff(t)))
        background = background_soft if background_soft is not None else float(np.percentile(soft, 5))

        peak_soft = float(soft.max())
        peak_hard = float(hard.max())
        peak_idx = int(np.argmax(soft))

        # 1. Rise velocity proxy: steepest positive SXR gradient before peak
        d_soft = np.gradient(soft, t)
        rise_grad = float(np.max(d_soft[: max(peak_idx, 1)])) if peak_idx > 0 else float(np.max(d_soft))
        rise_velocity_kms = max(0.0, rise_grad) * RISE_VELOCITY_SCALE_KMS

        # 2. Peak ratio (thermal / non-thermal)
        peak_ratio = peak_soft / max(peak_hard, 1e-15)

        # 3 & 4. Neupert cross-correlation and lag
        lag_s, corr = best_lag_cross_correlation(hard, d_soft, dt)

        # 5. Thermal decay time constant
        tau = decay_tau(t, soft, background)

        # 6. Event duration (FWHM)
        duration = fwhm(t, soft, background)

        # 7. Impulsiveness index: HXR peak / HXR rise time
        hard_peak_idx = int(np.argmax(hard))
        hard_bg = float(np.percentile(hard, 5))
        onset_thresh = hard_bg + (peak_hard - hard_bg) * 0.1
        onset_candidates = np.where(hard[:max(hard_peak_idx, 1)] <= onset_thresh)[0]
        onset_idx = int(onset_candidates[-1]) if len(onset_candidates) else 0
        hxr_rise_time = max(float(t[hard_peak_idx] - t[onset_idx]), dt)
        impulsiveness_index = peak_hard / hxr_rise_time

        goes_class = classify_goes(peak_soft)
        status = STATUS_BY_CLASS.get(class_letter(goes_class), "nominal")

        return BehaviourFingerprint(
            rise_velocity_kms=round(rise_velocity_kms, 1),
            peak_ratio=round(peak_ratio, 3),
            cross_correlation=round(abs(corr), 3),
            hxr_sxr_lag_s=round(lag_s, 1),
            thermal_decay_tau_s=round(tau, 1),
            event_duration_s=round(duration, 1),
            impulsiveness_index=float(f"{impulsiveness_index:.4g}"),
            goes_class=goes_class,
            status=status,
        )
