"""
Central, thread-safe mission state.

Every Flask endpoint reads from one shared MissionState instance instead
of computing its own independent random numbers, so the dashboard's cards
never contradict each other (e.g. the mission-status flare class always
matches the chart's current peak, the alert panel always matches the
behaviour fingerprint that triggered it, etc). A background thread
advances the flare simulator and recomputes derived state on a fixed
cadence; API handlers just read the latest snapshot under a lock.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from behaviour.classification import classify_goes, class_letter, STATUS_BY_CLASS, CLASS_RANK
from behaviour.engine import SolarBehaviourEngine, BehaviourFingerprint
from forecast.predictor import FlarePredictor
from retrieval.matcher import HistoricalMatcher
from simulation.flare_simulator import FlareSimulator, TelemetrySample

WALL_TICK_SECONDS = 1.0     # how often the background thread updates state
SIM_DT_SECONDS = 5.0        # simulated seconds advanced per tick
BUFFER_MAXLEN = 720         # 1 hour of simulated time at dt=5s
RECOMPUTE_EVERY_N_TICKS = 3  # fingerprint/forecast recompute cadence
FINGERPRINT_HISTORY_LEN = 16
PACKET_LOG_MAXLEN = 150

_HOUSEKEEPING_PARAMS = [
    {"payload": "SoLEXS", "parameter": "Det_Temp_A", "unit": "°C", "base": -20.0, "noise": 1.5},
    {"payload": "HEL1OS", "parameter": "HV_Supply_Status", "unit": "V", "base": 1800.0, "noise": 4.0},
    {"payload": "ASPEX", "parameter": "Proton_Density", "unit": "p/cm³", "base": 6.0, "noise": 3.5},
    {"payload": "PAPA", "parameter": "Electron_Temp", "unit": "K", "base": 102000.0, "noise": 4000.0},
    {"payload": "SYS", "parameter": "Ground_Link_Margin", "unit": "dBHz", "base": 97.5, "noise": 2.2},
]


@dataclass
class Alert:
    id: str
    title: str
    source: str
    severity: str
    timestamp: float
    description: str


@dataclass
class MissionSnapshot:
    now_sim_t: float
    soft: float
    hard: float
    goes_class: str
    status: str
    fingerprint: Optional[BehaviourFingerprint]
    fingerprint_history: dict
    health_index: int
    alerts: list
    packet_count: int


class MissionState:
    def __init__(self, seed: int = 2026):
        self.simulator = FlareSimulator(seed=seed, flare_probability_per_step=0.0025)
        self.engine = SolarBehaviourEngine()
        self.matcher = HistoricalMatcher()
        try:
            self.predictor: Optional[FlarePredictor] = FlarePredictor()
        except FileNotFoundError:
            self.predictor = None

        self.buffer: deque[TelemetrySample] = deque(maxlen=BUFFER_MAXLEN)
        self.fingerprint: Optional[BehaviourFingerprint] = None
        self.fingerprint_history: dict[str, deque] = {
            f: deque(maxlen=FINGERPRINT_HISTORY_LEN) for f in [
                "rise_velocity_kms", "peak_ratio", "cross_correlation", "hxr_sxr_lag_s",
                "thermal_decay_tau_s", "event_duration_s", "impulsiveness_index",
            ]
        }
        self.alerts: deque[Alert] = deque(maxlen=30)
        self.packet_log: deque[dict] = deque(maxlen=PACKET_LOG_MAXLEN)
        self.packet_count = 0
        self._tick_count = 0
        self._alert_seq = 0
        self._lock = threading.RLock()
        self._started_at = time.time()
        self._thread: Optional[threading.Thread] = None

    # ------------------------------------------------------------------ #
    def start(self):
        with self._lock:
            if self._thread is not None:
                return
            # warm up the buffer so the very first request has real data
            for _ in range(120):
                self._tick(seed_mode=True)
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def _run_loop(self):
        while True:
            time.sleep(WALL_TICK_SECONDS)
            with self._lock:
                self._tick()

    def _tick(self, seed_mode: bool = False):
        sample = self.simulator.step(dt=SIM_DT_SECONDS)
        self.buffer.append(sample)
        self.packet_count += 1
        self._tick_count += 1

        if seed_mode:
            if self._tick_count % 8 != 0:
                return
        elif self._tick_count % RECOMPUTE_EVERY_N_TICKS != 0:
            return

        self._recompute_fingerprint()
        self._maybe_raise_alerts()

    # ------------------------------------------------------------------ #
    def _recompute_fingerprint(self):
        if len(self.buffer) < 8:
            return
        t = np.array([s.t for s in self.buffer])
        soft = np.array([s.soft for s in self.buffer])
        hard = np.array([s.hard for s in self.buffer])

        # look at a trailing window so the fingerprint reflects "the current
        # event", not the whole hour of history
        window = min(len(t), 240)
        window_t, window_soft, window_hard = t[-window:], soft[-window:], hard[-window:]

        if not self._is_event_active(window_soft):
            # No flare-level excursion above the quiet-Sun background in this
            # window: don't fit Neupert-lag/decay-tau physics to pure noise
            # (that produces unstable, physically implausible values, e.g. a
            # multi-hour "decay constant" from a flat noisy baseline). Report
            # a neutral quiet fingerprint instead, consistent with the
            # instantaneous GOES class.
            goes_class = classify_goes(float(window_soft[-1]))
            fp = BehaviourFingerprint(
                rise_velocity_kms=0.0, peak_ratio=1.0, cross_correlation=0.0,
                hxr_sxr_lag_s=0.0, thermal_decay_tau_s=0.0, event_duration_s=0.0,
                impulsiveness_index=0.0, goes_class=goes_class,
                status=STATUS_BY_CLASS.get(class_letter(goes_class), "nominal"),
            )
        else:
            try:
                fp = self.engine.compute(window_t, window_soft, window_hard)
            except ValueError:
                return

        self.fingerprint = fp
        for field_name, history in self.fingerprint_history.items():
            history.append(getattr(fp, field_name))

    @staticmethod
    def _is_event_active(soft_window: np.ndarray, min_class_flux: float = 1e-7, excursion_ratio: float = 2.0) -> bool:
        """A window is considered to contain a real event only if its peak
        flux both clears a minimum GOES B-class threshold AND stands out
        meaningfully above that same window's own background level -
        otherwise it's indistinguishable from background wander."""
        background = float(np.percentile(soft_window, 5))
        peak = float(soft_window.max())
        return peak >= min_class_flux and peak >= background * excursion_ratio

    def _maybe_raise_alerts(self):
        if not self.buffer:
            return
        latest = self.buffer[-1]
        letter = class_letter(classify_goes(latest.soft))

        def add_alert(title, source, severity, description):
            self._alert_seq += 1
            self.alerts.append(Alert(
                id=f"alt-{self._alert_seq:05d}", title=title, source=source,
                severity=severity, timestamp=time.time(), description=description,
            ))

        recent_titles = {a.title for a in list(self.alerts)[-4:]}

        if letter == "X" and "Critical X-Ray Flux Threshold Crossed" not in recent_titles:
            add_alert(
                "Critical X-Ray Flux Threshold Crossed", "SoLEXS Instrument", "critical",
                f"Soft X-ray flux reached {latest.soft:.2e} W/m², in GOES X-class range.",
            )
        elif letter == "M" and "Elevated Soft X-Ray Flux" not in recent_titles:
            add_alert(
                "Elevated Soft X-Ray Flux", "SoLEXS Instrument", "high",
                f"Soft X-ray flux reached {latest.soft:.2e} W/m², in GOES M-class range.",
            )

        if self.fingerprint and self.fingerprint.cross_correlation > 0.75 and \
                "Strong Neupert-Effect Correlation Detected" not in recent_titles:
            add_alert(
                "Strong Neupert-Effect Correlation Detected", "Physics Engine", "medium",
                f"HXR/SXR cross-correlation reached {self.fingerprint.cross_correlation:.2f}, "
                f"indicating a well-coupled impulsive/gradual phase pair.",
            )

        if self.fingerprint and self.fingerprint.impulsiveness_index > 3e-6 and \
                "Impulsive Peak Detected" not in recent_titles:
            add_alert(
                "Impulsive Peak Detected", "HEL1OS Instrument", "high",
                f"HXR impulsiveness index reached {self.fingerprint.impulsiveness_index:.2e}, "
                f"consistent with rapid non-thermal electron acceleration.",
            )

    # ------------------------------------------------------------------ #
    def health_index(self) -> int:
        if not self.buffer:
            return 15
        letter = class_letter(classify_goes(self.buffer[-1].soft))
        base = {"A": 12, "B": 28, "C": 48, "M": 72, "X": 92}[letter]
        jitter = int((hash(int(self.buffer[-1].t)) % 7) - 3)
        return max(2, min(99, base + jitter))

    def housekeeping_packet(self) -> dict:
        import random as _random
        p = _random.choice(_HOUSEKEEPING_PARAMS)
        value = p["base"] + _random.gauss(0, p["noise"])
        return {
            "payload": p["payload"],
            "parameter": p["parameter"],
            "value": f"{value:.2f} {p['unit']}",
            "status": "nominal",
        }

    # ------------------------------------------------------------------ #
    def snapshot(self) -> MissionSnapshot:
        with self._lock:
            latest = self.buffer[-1] if self.buffer else None
            goes_class = classify_goes(latest.soft) if latest else "A0.0"
            letter = class_letter(goes_class)
            return MissionSnapshot(
                now_sim_t=latest.t if latest else 0.0,
                soft=latest.soft if latest else 0.0,
                hard=latest.hard if latest else 0.0,
                goes_class=goes_class,
                status=STATUS_BY_CLASS.get(letter, "nominal"),
                fingerprint=self.fingerprint,
                fingerprint_history={k: list(v) for k, v in self.fingerprint_history.items()},
                health_index=self.health_index(),
                alerts=list(self.alerts),
                packet_count=self.packet_count,
            )

    def telemetry_window(self, n: int = 90) -> list[TelemetrySample]:
        with self._lock:
            return list(self.buffer)[-n:]

    def uptime_seconds(self) -> float:
        return time.time() - self._started_at


mission_state = MissionState()
