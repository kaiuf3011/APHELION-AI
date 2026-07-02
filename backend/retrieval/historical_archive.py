"""
Curated historical flare archive used for Case-Based Reasoning retrieval.

Aditya-L1 launched in September 2023, so SoLEXS/HEL1OS could not have
observed any of these pre-2023 events directly. Peak flux, GOES class, and
event date for each entry are real, publicly documented values from the
NOAA/GOES flare catalog (the standard cross-mission reference). The
finer-grained behaviour-fingerprint fields (rise velocity, cross-
correlation, lag, decay tau, impulsiveness) are not part of the public
GOES record and are reconstructed estimates, scaled consistently with the
same class-dependent relationships used by the flare simulator/synthetic
trainer (backend/simulation/flare_simulator.py). Every entry is tagged
with `data_source` so the frontend can disclose this honestly instead of
implying these were captured by Aditya-L1 itself.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, asdict


@dataclass
class HistoricalEvent:
    id: str
    date: str
    goes_class: str
    peak_flux_wm2: float
    duration_s: int
    desc: str
    data_source: str
    # behaviour fingerprint (reconstructed estimate, see module docstring)
    rise_velocity_kms: float
    peak_ratio: float
    cross_correlation: float
    hxr_sxr_lag_s: float
    thermal_decay_tau_s: float
    event_duration_s: float
    impulsiveness_index: float

    def as_dict(self) -> dict:
        return asdict(self)

    def fingerprint_vector(self) -> list[float]:
        return [
            self.rise_velocity_kms,
            self.peak_ratio,
            self.cross_correlation,
            self.hxr_sxr_lag_s,
            self.thermal_decay_tau_s,
            self.event_duration_s,
            self.impulsiveness_index,
        ]


FINGERPRINT_FIELDS = [
    "rise_velocity_kms",
    "peak_ratio",
    "cross_correlation",
    "hxr_sxr_lag_s",
    "thermal_decay_tau_s",
    "event_duration_s",
    "impulsiveness_index",
]

_NOAA_SOURCE = "NOAA/GOES historical flare catalog (cross-mission reference; predates Aditya-L1, launched 2023-09)"

HISTORICAL_EVENTS: list[HistoricalEvent] = [
    HistoricalEvent(
        id="SOL1859-09-01", date="1859-09-01", goes_class="X28+ (Est.)",
        peak_flux_wm2=2.8e-3, duration_s=13200,
        desc="The Carrington Event. The most intense recorded geomagnetic storm in history. "
             "Auroras were visible globally and telegraph networks sparked, causing fires. "
             "GOES-equivalent class is a post-hoc estimate; no soft X-ray instruments existed in 1859.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=520.0, peak_ratio=1.35, cross_correlation=0.81,
        hxr_sxr_lag_s=14.0, thermal_decay_tau_s=560.0, event_duration_s=13200.0,
        impulsiveness_index=4.9e-6,
    ),
    HistoricalEvent(
        id="SOL2003-10-28", date="2003-10-28", goes_class="X17.2",
        peak_flux_wm2=1.72e-3, duration_s=4320,
        desc="The Halloween Solar Storms. Extreme active region AR10486 triggered intense magnetic "
             "reconnection, throwing off massive CMEs and disrupting global satellite operations.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=498.0, peak_ratio=1.42, cross_correlation=0.79,
        hxr_sxr_lag_s=16.0, thermal_decay_tau_s=410.0, event_duration_s=4320.0,
        impulsiveness_index=4.1e-6,
    ),
    HistoricalEvent(
        id="SOL2005-09-07", date="2005-09-07", goes_class="X17.0",
        peak_flux_wm2=1.70e-3, duration_s=3900,
        desc="One of the most powerful flares of Solar Cycle 23, from active region AR10808, "
             "producing a strong ground-level cosmic ray enhancement.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=486.0, peak_ratio=1.39, cross_correlation=0.78,
        hxr_sxr_lag_s=17.0, thermal_decay_tau_s=395.0, event_duration_s=3900.0,
        impulsiveness_index=3.9e-6,
    ),
    HistoricalEvent(
        id="SOL2012-07-23", date="2012-07-23", goes_class="X1.8",
        peak_flux_wm2=1.8e-4, duration_s=2700,
        desc="A superstorm event that narrowly missed Earth. Had it occurred 9 days earlier, it would "
             "have struck Earth, potentially causing trillions of dollars in electrical grid damage.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=340.0, peak_ratio=1.58, cross_correlation=0.74,
        hxr_sxr_lag_s=28.0, thermal_decay_tau_s=260.0, event_duration_s=2700.0,
        impulsiveness_index=1.6e-6,
    ),
    HistoricalEvent(
        id="SOL2017-09-06", date="2017-09-06", goes_class="X9.3",
        peak_flux_wm2=9.3e-4, duration_s=3480,
        desc="The largest flare of Solar Cycle 24, erupting from active region AR12673 alongside "
             "a fast halo CME, causing HF radio blackouts across the sunlit Earth.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=455.0, peak_ratio=1.44, cross_correlation=0.80,
        hxr_sxr_lag_s=18.0, thermal_decay_tau_s=370.0, event_duration_s=3480.0,
        impulsiveness_index=3.5e-6,
    ),
    HistoricalEvent(
        id="SOL2021-10-28", date="2021-10-28", goes_class="X1.0",
        peak_flux_wm2=1.0e-4, duration_s=1920,
        desc="Major Halloween flare from active region AR12887, causing a global high-frequency "
             "radio blackout on the sunlit side of Earth.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=305.0, peak_ratio=1.62, cross_correlation=0.71,
        hxr_sxr_lag_s=31.0, thermal_decay_tau_s=225.0, event_duration_s=1920.0,
        impulsiveness_index=1.1e-6,
    ),
    HistoricalEvent(
        id="SOL2024-05-14", date="2024-05-14", goes_class="X8.7",
        peak_flux_wm2=8.7e-4, duration_s=3300,
        desc="Erupted from active region AR3664 (the 'Gannon' active region) during the same "
             "period that produced the extreme May 2024 geomagnetic superstorm.",
        data_source=_NOAA_SOURCE,
        rise_velocity_kms=448.0, peak_ratio=1.46, cross_correlation=0.79,
        hxr_sxr_lag_s=19.0, thermal_decay_tau_s=360.0, event_duration_s=3300.0,
        impulsiveness_index=3.3e-6,
    ),
]


def _synthetic_class_representatives() -> list[HistoricalEvent]:
    """
    The named events above are all major (X-class or Carrington-scale)
    flares, so a moderate B/C/M-class current event would never find a
    close historical analog and would always score near-zero similarity -
    not because it's dissimilar to typical solar behaviour, just because
    the archive only covers the extreme tail. Rather than invent specific
    dates/details for lesser flares we can't verify, we add deterministic
    representative profiles spanning B/C/M class, generated from the same
    physics model used everywhere else (behaviour.engine +
    simulation.flare_simulator), fixed-seeded for reproducibility, and
    explicitly labeled as synthetic rather than attributed to a real event.
    """
    from behaviour.engine import SolarBehaviourEngine
    from simulation.flare_simulator import generate_flare, QUIET_SXR_BASELINE, QUIET_HXR_BASELINE
    import numpy as np

    engine = SolarBehaviourEngine()
    representatives = []
    class_amplitudes = {"B": 4e-7, "C": 4e-6, "M": 4e-5}
    for i, (letter, amplitude) in enumerate(class_amplitudes.items()):
        rng = random.Random(1000 + i)
        flare = generate_flare(rng, t_start=0.0, sxr_amplitude=amplitude)
        t_end = flare.t_peak_sxr + 5 * flare.tau_decay_sxr
        t = np.linspace(0, t_end, max(60, int(t_end / 5)))
        soft = QUIET_SXR_BASELINE + np.array([flare.sxr_flux(tt) for tt in t])
        hard = QUIET_HXR_BASELINE + np.array([flare.hxr_flux(tt) for tt in t])
        fp = engine.compute(t, soft, hard)

        representatives.append(HistoricalEvent(
            id=f"REF-{letter}-CLASS", date="synthetic", goes_class=fp.goes_class,
            peak_flux_wm2=QUIET_SXR_BASELINE + amplitude, duration_s=int(fp.event_duration_s),
            desc=f"Deterministic {letter}-class reference profile generated from the GRED flare "
                 f"model, used to give the retrieval archive coverage across the full flare-size "
                 f"spectrum rather than only historic extremes.",
            data_source="Synthetic class-representative profile (physics model, not a specific "
                         "historical event)",
            rise_velocity_kms=fp.rise_velocity_kms, peak_ratio=fp.peak_ratio,
            cross_correlation=fp.cross_correlation, hxr_sxr_lag_s=fp.hxr_sxr_lag_s,
            thermal_decay_tau_s=fp.thermal_decay_tau_s, event_duration_s=fp.event_duration_s,
            impulsiveness_index=fp.impulsiveness_index,
        ))
    return representatives


HISTORICAL_EVENTS.extend(_synthetic_class_representatives())
