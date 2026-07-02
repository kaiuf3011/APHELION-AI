"""
Playback position tracker for real-event replay. Mirrors the live
MissionState's "always advancing" feel (backend/state/mission_state.py)
but scrubs through a cached real day's data instead of a simulator,
looping back to the start when it reaches the end.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import numpy as np

from replay.real_data_loader import load_event_series, discover_real_events

WALL_TICK_SECONDS = 1.0
REPLAY_STEP_SAMPLES = 20  # samples advanced per tick (real data is ~1 sample/sec)
WINDOW_SAMPLES = 600      # ~10 minutes of real telemetry shown per snapshot


@dataclass
class ReplayPosition:
    event_id: str
    index: int


class ReplayState:
    def __init__(self):
        self._lock = threading.RLock()
        self._positions: dict[str, int] = {}
        self._thread: threading.Thread | None = None

    def start(self):
        with self._lock:
            if self._thread is not None:
                return
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def _run_loop(self):
        while True:
            time.sleep(WALL_TICK_SECONDS)
            with self._lock:
                for event_id in list(self._positions.keys()):
                    self._advance(event_id)

    def _advance(self, event_id: str):
        try:
            series = load_event_series(event_id)
        except Exception:
            return
        current = self._positions.get(event_id, WINDOW_SAMPLES)
        next_pos = current + REPLAY_STEP_SAMPLES
        if next_pos >= len(series):
            next_pos = WINDOW_SAMPLES  # loop back to the start
        self._positions[event_id] = next_pos

    def position(self, event_id: str) -> int:
        with self._lock:
            if event_id not in self._positions:
                self._positions[event_id] = self._initial_position(event_id)
            return self._positions[event_id]

    @staticmethod
    def _initial_position(event_id: str) -> int:
        """
        Start each event's replay a bit before its own peak sample, not at
        the very beginning of the day - at REPLAY_STEP_SAMPLES/tick, walking
        an ~86,400-sample day from index 0 would take hours of real time to
        reach the interesting part. Starting near the peak means the
        replay is immediately showing the event's most active moment, then
        keeps scrolling forward (and loops) from there.

        `position` is the *end* (exclusive) of the trailing window used by
        window() below, so to center the peak inside that window we need
        position = peak_idx + WINDOW_SAMPLES/2, not peak_idx - WINDOW_SAMPLES/2.

        For dual-channel days, HEL1OS typically covers less of the day than
        SoLEXS (e.g. a ~12h window out of a 24h SoLEXS day). The SoLEXS-only
        global peak can fall entirely outside that coverage, which would
        open the replay on a window with no HXR data at all despite HEL1OS
        being available for that day - the least useful case to land on. So
        when both channels exist, rank candidate peaks by SoLEXS activity
        but restrict the search to samples that actually have a HEL1OS
        match, falling back to the unrestricted global peak only if there's
        no overlap at all.
        """
        try:
            series = load_event_series(event_id)
        except Exception:
            return WINDOW_SAMPLES

        soft = series["soft"].to_numpy()
        hard = series["hard"].to_numpy()
        has_coverage = ~np.isnan(hard)

        if has_coverage.any():
            covered_soft = np.where(has_coverage, soft, -np.inf)
            peak_idx = int(np.argmax(covered_soft))
        else:
            peak_idx = int(np.argmax(soft))

        end = peak_idx + WINDOW_SAMPLES // 2
        return max(WINDOW_SAMPLES, min(end, len(series) - 1))

    def window(self, event_id: str):
        series = load_event_series(event_id)
        idx = self.position(event_id)
        lo = max(0, idx - WINDOW_SAMPLES)
        return series.iloc[lo:idx], series


replay_state = ReplayState()
