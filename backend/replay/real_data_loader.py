"""
Discovers and caches real Aditya-L1 SoLEXS/HEL1OS archives dropped into
backend/data/raw/ (see backend/loaders/ for the underlying FITS parsing).

IMPORTANT: SoLEXS `COUNTS` and HEL1OS `CTR` are raw, uncalibrated detector
count rates - not physical flux in W/m^2. Converting them requires the
instrument's effective-area/gain calibration, which isn't included in
these Level-1 product files or documented anywhere in this repo. Do NOT
run backend/behaviour/classification.classify_goes() (or anything that
assumes W/m^2 units, like the rise-velocity-to-km/s heuristic) on this
data - see backend/replay/real_fingerprint.py for the honestly-scoped
alternative used for real data instead.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from loaders.solexs import SolexsLoader
from loaders.hel1os import Hel1osLoader
from preprocessing.synchronizer import TelemetrySynchronizer

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

_SOLEXS_DATE_RE = re.compile(r"AL1_SLX_L1_(\d{8})_")
_HEL1OS_DATE_RE = re.compile(r"HLS_(\d{8})_")


@dataclass
class RealEventMeta:
    event_id: str          # YYYY-MM-DD
    solexs_zip: Path
    hel1os_zip: Optional[Path]
    peak_counts: float
    mean_counts: float
    has_dual_channel: bool


def discover_real_events() -> list[RealEventMeta]:
    """Scan backend/data/raw/ for SoLEXS days and match them (by date) to a
    HEL1OS window if one exists. Every real day found on disk is returned;
    events without HEL1OS coverage are still included but flagged
    has_dual_channel=False since lag/cross-correlation aren't computable
    without both channels."""
    solexs_dirs = list(RAW_DIR.glob("solexs_*"))
    hel1os_dirs = list(RAW_DIR.glob("hel1os_*"))

    hel1os_by_date: dict[str, Path] = {}
    for h_dir in hel1os_dirs:
        for z in sorted(h_dir.glob("*.zip")):
            m = _HEL1OS_DATE_RE.search(z.name)
            if m and m.group(1) not in hel1os_by_date:
                hel1os_by_date[m.group(1)] = z

    events = []
    for s_dir in solexs_dirs:
        for z in sorted(s_dir.glob("*.zip")):
            m = _SOLEXS_DATE_RE.search(z.name)
            if not m:
                continue
            date_str = m.group(1)  # YYYYMMDD
            event_id = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            hel1os_zip = hel1os_by_date.get(date_str)

            try:
                df = SolexsLoader(str(z)).load_lightcurve()
            except Exception:
                df = None
            if df is None or df.empty:
                continue

            events.append(RealEventMeta(
                event_id=event_id,
                solexs_zip=z,
                hel1os_zip=hel1os_zip,
                peak_counts=float(df["solexs_flux"].max()),
                mean_counts=float(df["solexs_flux"].mean()),
                has_dual_channel=hel1os_zip is not None,
            ))

    return sorted(events, key=lambda e: e.peak_counts, reverse=True)


@lru_cache(maxsize=16)
def load_event_series(event_id: str) -> pd.DataFrame:
    """Load (and cache in-process) the real telemetry for one event_id as a
    DataFrame with columns [timestamp, soft, hard]. `hard` is NaN wherever
    there's no HEL1OS coverage (single-channel days)."""
    events = {e.event_id: e for e in discover_real_events()}
    if event_id not in events:
        raise KeyError(f"Unknown real event_id: {event_id}")
    meta = events[event_id]

    s_df = SolexsLoader(str(meta.solexs_zip)).load_lightcurve()
    if s_df is None or s_df.empty:
        raise ValueError(f"SoLEXS data failed to load for {event_id}")

    if meta.hel1os_zip is not None:
        h_df = Hel1osLoader(str(meta.hel1os_zip)).load_lightcurve()
    else:
        h_df = None

    if h_df is not None and not h_df.empty:
        sync = TelemetrySynchronizer(tolerance_seconds=2.0)
        unified = sync.synchronize(s_df, h_df)
        # de-duplicate near-identical timestamps (SoLEXS can emit more than
        # one sample per whole second) by averaging within each second
        unified["timestamp"] = unified["timestamp"].round(0)
        unified = unified.groupby("timestamp", as_index=False).mean().sort_values("timestamp")
        out = pd.DataFrame({
            "timestamp": unified["timestamp"].values,
            "soft": unified["solexs_flux"].values,
            "hard": unified["hel1os_flux"].values,
        })
    else:
        s_df = s_df.copy()
        s_df["timestamp"] = s_df["timestamp"].round(0)
        s_df = s_df.groupby("timestamp", as_index=False).mean().sort_values("timestamp")
        out = pd.DataFrame({
            "timestamp": s_df["timestamp"].values,
            "soft": s_df["solexs_flux"].values,
            "hard": np.full(len(s_df), np.nan),
        })

    return out.reset_index(drop=True)
