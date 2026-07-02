"""
Physics-motivated SXR/HXR telemetry simulator.

No raw Aditya-L1 downlink files ship with this repository (backend/data/raw
is intentionally .gitignore'd), so there is nothing for the loaders in
backend/loaders/ to parse yet. Until real SoLEXS/HEL1OS archives are dropped
in, this module stands in as the "instrument" feeding the rest of the
pipeline (behaviour engine, retrieval, forecaster, API) so the platform is
demonstrable end-to-end on physically plausible data rather than pure
Math.random() noise.

Flare morphology follows the Gaussian-rise / exponential-decay (GRED)
parametrization commonly fit to GOES soft X-ray light curves, e.g.
Gryciuk et al. 2017, "Peak flux and duration relationship of GOES X- and
M-class flares" (Solar Physics 292:77):

    F(t) = F_bg + A * exp(-(t - t_peak)^2 / (2 * sigma_rise^2))   for t <  t_peak
    F(t) = F_bg + A * exp(-(t - t_peak) / tau_decay)              for t >= t_peak

The hard X-ray (HEL1OS) channel is modeled with the same functional form but
a narrower, earlier-peaking profile, consistent with the impulsive-phase
timing described by the Neupert effect (Neupert 1968, ApJ 153:L59; Dennis &
Zarro 1993, Solar Physics 146:177) where non-thermal HXR-producing electron
beams precede and drive the thermal SXR rise via chromospheric evaporation.

Flare occurrence frequency follows the well-established power-law
flare-size distribution (Crosby et al. 1993; Aschwanden & Freeland 2012):
dN/dF ~ F^-alpha with alpha ~ 1.8-2.0, i.e. small flares are far more common
than large ones. GOES classification thresholds (1-8 Angstrom peak flux,
NOAA SWPC standard) are used throughout: A < 1e-7, B 1e-7-1e-6,
C 1e-6-1e-5, M 1e-5-1e-4, X >= 1e-4 W/m^2.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Optional

from behaviour.classification import classify_goes

QUIET_SXR_BASELINE = 3.0e-9   # W/m^2, typical A-class quiet-sun SXR background
QUIET_HXR_BASELINE = 2.0e-10  # W/m^2-equivalent quiet-sun HXR background
SXR_NOISE_SIGMA = 0.06        # fractional multiplicative noise (detector shot noise proxy)
HXR_NOISE_SIGMA = 0.10


@dataclass
class FlareEvent:
    """One simulated flare, parametrized per the GRED model above."""
    t_peak_sxr: float
    sxr_amplitude: float          # peak flux above background, W/m^2
    sigma_rise_sxr: float         # seconds
    tau_decay_sxr: float          # seconds

    hxr_lag: float                # seconds; HXR peaks this long BEFORE SXR peak
    hxr_amplitude: float          # W/m^2-equivalent
    sigma_rise_hxr: float
    tau_decay_hxr: float

    goes_class: str = ""

    def __post_init__(self):
        self.goes_class = classify_goes(QUIET_SXR_BASELINE + self.sxr_amplitude)

    @property
    def t_peak_hxr(self) -> float:
        return self.t_peak_sxr - self.hxr_lag

    def sxr_flux(self, t: float) -> float:
        if t < self.t_peak_sxr:
            return self.sxr_amplitude * math.exp(-((t - self.t_peak_sxr) ** 2) / (2 * self.sigma_rise_sxr ** 2))
        return self.sxr_amplitude * math.exp(-(t - self.t_peak_sxr) / self.tau_decay_sxr)

    def hxr_flux(self, t: float) -> float:
        tp = self.t_peak_hxr
        if t < tp:
            return self.hxr_amplitude * math.exp(-((t - tp) ** 2) / (2 * self.sigma_rise_hxr ** 2))
        return self.hxr_amplitude * math.exp(-(t - tp) / self.tau_decay_hxr)

    def is_active(self, t: float, tail_lengths: float = 6.0) -> bool:
        end = self.t_peak_sxr + tail_lengths * self.tau_decay_sxr
        start = min(self.t_peak_sxr - 4 * self.sigma_rise_sxr, self.t_peak_hxr - 4 * self.sigma_rise_hxr)
        return start <= t <= end


def sample_flare_class(rng: random.Random) -> float:
    """
    Sample a peak SXR flux from a power-law-weighted distribution biased
    toward small events, matching the observed solar flare frequency-size
    relation (Crosby et al. 1993). Returns peak flux in W/m^2 (background
    excluded).
    """
    # Sample class letter with realistic relative occurrence rates.
    r = rng.random()
    if r < 0.55:
        lo, hi = 1e-7, 1e-6          # B-class
    elif r < 0.85:
        lo, hi = 1e-6, 1e-5          # C-class
    elif r < 0.97:
        lo, hi = 1e-5, 1e-4          # M-class
    else:
        lo, hi = 1e-4, 6e-4          # X-class

    # log-uniform within the decade for the power-law tail shape
    log_lo, log_hi = math.log10(lo), math.log10(hi)
    return 10 ** rng.uniform(log_lo, log_hi)


def generate_flare(rng: random.Random, t_start: float, sxr_amplitude: Optional[float] = None) -> FlareEvent:
    """
    Build a physically self-consistent FlareEvent. Larger flares get
    proportionally longer rise/decay times (larger flares involve larger
    reconnecting loops and thus longer energy release + cooling timescales,
    consistent with the peak-flux/duration relation reported in Gryciuk et
    al. 2017) and shorter Neupert (HXR->SXR) lags, since more impulsive,
    energetic electron beams evaporate chromospheric plasma faster.

    `sxr_amplitude` can be supplied explicitly (e.g. by the synthetic
    training-set generator, which samples flare classes ~uniformly rather
    than from the realistic power-law occurrence distribution used here) to
    reuse this same class-dependent scaling logic without duplicating it.
    """
    if sxr_amplitude is None:
        sxr_amplitude = sample_flare_class(rng)
    goes_class_letter = classify_goes(QUIET_SXR_BASELINE + sxr_amplitude)[0]

    # Empirical scaling bands per flare class (broad literature-consistent
    # ranges rather than a single formula, since real flares show large
    # scatter): bigger class -> longer rise/decay, shorter Neupert lag.
    scale = {"A": 0.15, "B": 0.3, "C": 0.6, "M": 1.0, "X": 1.8}[goes_class_letter]

    sigma_rise_sxr = rng.uniform(60, 150) * scale
    tau_decay_sxr = rng.uniform(180, 420) * scale

    hxr_lag = rng.uniform(8, 45) / max(scale, 0.4)          # bigger flares -> shorter lag
    hxr_amplitude = sxr_amplitude * rng.uniform(0.35, 0.85)  # nonthermal/thermal peak ratio
    sigma_rise_hxr = sigma_rise_sxr * rng.uniform(0.25, 0.45)
    tau_decay_hxr = tau_decay_sxr * rng.uniform(0.2, 0.4)

    return FlareEvent(
        t_peak_sxr=t_start + sigma_rise_sxr * 3 + rng.uniform(0, 30),
        sxr_amplitude=sxr_amplitude,
        sigma_rise_sxr=sigma_rise_sxr,
        tau_decay_sxr=tau_decay_sxr,
        hxr_lag=hxr_lag,
        hxr_amplitude=hxr_amplitude,
        sigma_rise_hxr=sigma_rise_hxr,
        tau_decay_hxr=tau_decay_hxr,
    )


@dataclass
class TelemetrySample:
    t: float
    soft: float
    hard: float


class FlareSimulator:
    """
    Stateful generator advancing simulated time and emitting
    (soft, hard) flux samples at each step, with occasional flares
    superimposed on a noisy quiet-sun background.
    """

    def __init__(self, seed: Optional[int] = None, flare_probability_per_step: float = 0.003):
        self.rng = random.Random(seed)
        self.t = 0.0
        self.flare_probability_per_step = flare_probability_per_step
        self.active_flares: list[FlareEvent] = []
        self._ou_soft = 0.0  # Ornstein-Uhlenbeck noise state for background wander
        self._ou_hard = 0.0

    def _maybe_spawn_flare(self):
        if len(self.active_flares) < 2 and self.rng.random() < self.flare_probability_per_step:
            self.active_flares.append(generate_flare(self.rng, self.t))

    def _background_noise(self, dt: float) -> tuple[float, float]:
        # simple mean-reverting (OU) noise so the quiet baseline wanders
        # smoothly instead of jittering independently every tick
        theta, sigma = 0.05, 0.15
        self._ou_soft += theta * (0 - self._ou_soft) * dt + sigma * self.rng.gauss(0, 1) * math.sqrt(dt)
        self._ou_hard += theta * (0 - self._ou_hard) * dt + sigma * self.rng.gauss(0, 1) * math.sqrt(dt)
        return self._ou_soft, self._ou_hard

    def step(self, dt: float = 5.0) -> TelemetrySample:
        self.t += dt
        self._maybe_spawn_flare()
        self.active_flares = [f for f in self.active_flares if f.is_active(self.t)]

        soft = QUIET_SXR_BASELINE
        hard = QUIET_HXR_BASELINE
        for flare in self.active_flares:
            soft += flare.sxr_flux(self.t)
            hard += flare.hxr_flux(self.t)

        ou_soft, ou_hard = self._background_noise(dt)
        soft *= max(0.05, 1.0 + ou_soft * SXR_NOISE_SIGMA + self.rng.gauss(0, SXR_NOISE_SIGMA * 0.3))
        hard *= max(0.05, 1.0 + ou_hard * HXR_NOISE_SIGMA + self.rng.gauss(0, HXR_NOISE_SIGMA * 0.3))

        return TelemetrySample(t=self.t, soft=max(soft, 1e-10), hard=max(hard, 1e-11))

    def current_flare(self) -> Optional[FlareEvent]:
        """Most significant currently-active flare, if any."""
        if not self.active_flares:
            return None
        return max(self.active_flares, key=lambda f: f.sxr_amplitude)
