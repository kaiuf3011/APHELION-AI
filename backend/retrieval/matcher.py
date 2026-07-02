"""
KDTree-based historical behaviour retrieval.

Instead of an opaque probability score, APHELION retrieves the closest
historical analog(s) by nearest-neighbor search over standardized
7-dimensional behaviour fingerprints (see backend/behaviour/engine.py).
Fingerprint dimensions are z-score normalized (each feature has very
different natural scale/units, e.g. seconds vs. correlation coefficients
vs. W/m^2/s) before distance is computed, so no single dimension
dominates purely due to its units.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.spatial import cKDTree

from .historical_archive import HISTORICAL_EVENTS, HistoricalEvent, FINGERPRINT_FIELDS


@dataclass
class SimilarityMatch:
    event: HistoricalEvent
    similarity_pct: float
    distance: float


class HistoricalMatcher:
    def __init__(self, events: list[HistoricalEvent] | None = None):
        self.events = events if events is not None else HISTORICAL_EVENTS
        raw = np.array([e.fingerprint_vector() for e in self.events], dtype=float)
        self.mean = raw.mean(axis=0)
        self.std = np.where(raw.std(axis=0) < 1e-9, 1.0, raw.std(axis=0))
        self._normalized = (raw - self.mean) / self.std
        self.tree = cKDTree(self._normalized)

    def _normalize(self, vector: list[float]) -> np.ndarray:
        return (np.array(vector, dtype=float) - self.mean) / self.std

    def query(self, fingerprint_vector: list[float], k: int = 3) -> list[SimilarityMatch]:
        k = min(k, len(self.events))
        vec = self._normalize(fingerprint_vector)
        distances, indices = self.tree.query(vec, k=k)
        distances = np.atleast_1d(distances)
        indices = np.atleast_1d(indices)

        # Convert normalized Euclidean distance to a similarity percentage.
        # Scale factor chosen so that a "typical" archive-to-archive
        # nearest-neighbor distance maps to roughly 85-95% similarity, and
        # distances several times that decay toward 0.
        scale = max(float(np.median(self._pairwise_nn_distances())), 0.5)

        matches = []
        for dist, idx in zip(distances, indices):
            similarity = 100.0 * np.exp(-dist / (2.0 * scale))
            matches.append(SimilarityMatch(
                event=self.events[int(idx)],
                similarity_pct=round(float(similarity), 1),
                distance=round(float(dist), 3),
            ))
        return matches

    def _pairwise_nn_distances(self) -> np.ndarray:
        # nearest-neighbor distance of each archive point to another archive
        # point, used only to auto-scale the similarity curve
        dists, _ = self.tree.query(self._normalized, k=2)
        return dists[:, 1]
