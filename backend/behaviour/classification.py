"""
GOES 1-8 Angstrom soft X-ray flare classification.

Standard adopted by NOAA SWPC and used as the common cross-mission
reference scale for solar flare intensity (including by ISRO Aditya-L1
publications benchmarking SoLEXS against GOES). Thresholds are on peak
flux in the 1-8 Angstrom band, in W/m^2.
"""
from __future__ import annotations

GOES_THRESHOLDS = [
    ("A", 1e-8, 1e-7),
    ("B", 1e-7, 1e-6),
    ("C", 1e-6, 1e-5),
    ("M", 1e-5, 1e-4),
    ("X", 1e-4, 1e-2),
]

CLASS_RANK = {"A": 0, "B": 1, "C": 2, "M": 3, "X": 4}

STATUS_BY_CLASS = {
    "A": "nominal",
    "B": "nominal",
    "C": "watch",
    "M": "critical",
    "X": "critical",
}


def classify_goes(peak_flux_wm2: float) -> str:
    """Return a GOES class string like 'M8.4' or 'X1.7' for a peak flux in W/m^2."""
    for letter, lo, hi in GOES_THRESHOLDS:
        if lo <= peak_flux_wm2 < hi:
            return f"{letter}{peak_flux_wm2 / lo:.1f}"
    if peak_flux_wm2 < GOES_THRESHOLDS[0][1]:
        return f"A{max(peak_flux_wm2 / 1e-8, 0.1):.1f}"
    return f"X{peak_flux_wm2 / 1e-4:.1f}"


def class_letter(goes_class: str) -> str:
    return goes_class[0]


def flux_for_class(letter: str, sub: float) -> float:
    """Inverse of classify_goes: given e.g. ('M', 8.4) return flux in W/m^2."""
    for l, lo, _hi in GOES_THRESHOLDS:
        if l == letter:
            return sub * lo
    raise ValueError(f"Unknown GOES class letter: {letter}")
