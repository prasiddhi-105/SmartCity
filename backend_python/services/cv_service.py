"""
backend_python/services/cv_service.py
=======================================
Business-logic wrapper around the CV AI loader.

Responsibilities
----------------
* Accept raw image bytes from the router.
* Call bundle["predict_fn"] (real CrowdAnalysisPipeline OR mock — transparent).
* Extract and normalise crowd density + anomaly signals into a unified dict
  that the danger aggregator can consume.
* Optionally reset the pipeline's internal anomaly state between sessions.

This module NEVER loads a model itself — it always delegates to get_cv_bundle().
"""

from __future__ import annotations

import logging
from typing import Any

from ai.cv.loader import get_cv_bundle
from utils.scoring import normalize_score, score_to_level, clamp

logger = logging.getLogger(__name__)

# Crowd density string → numeric danger contribution [0.0, 1.0]
_DENSITY_DANGER: dict[str, float] = {
    "LOW":      0.10,
    "MEDIUM":   0.45,
    "HIGH":     0.80,
    "CRITICAL": 1.00,
}


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_frame(
    image_bytes: bytes,
    bundle: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Run the computer vision analysis pipeline on a single frame.

    Args
    ----
    image_bytes : Raw JPEG / PNG / video-frame bytes from the route handler.

    Returns
    -------
    {
        "person_count":        int,
        "crowd_density":       "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "density_danger":      float,   # [0.0, 1.0] danger contribution
        "anomaly_detected":    bool,
        "anomalies":           list[dict],
        "safety_score":        int,     # 0–100, higher = safer
        "danger_score":        float,   # [0.0, 1.0], higher = more dangerous
        "danger_level":        str,     # "safe" | "moderate" | "unsafe" | "critical"
        "confidence":          float,
        "inference_ms":        float,
        "loader_status":       str,     # "loaded" | "fallback"
    }
    """
    bundle = bundle or get_cv_bundle()
    status = bundle.get("status", "unknown")

    try:
        logger.debug("Processing frame payload. Size: %d bytes", len(image_bytes))
        raw = bundle["predict_fn"](image_bytes)
    except Exception as exc:
        logger.error("CV predict_fn raised an exception: %s", exc, exc_info=True)
        return _error_result(str(exc), status)

    extra = raw.get("extra", {})
    density_str = extra.get("crowd_density", raw.get("prediction", "LOW")).upper()
    person_count = int(extra.get("person_count", 0))
    anomaly_detected = bool(extra.get("anomaly_detected", False))
    anomalies = extra.get("anomalies", [])
    safety_score = int(extra.get("safety_score", 75))
    inference_ms = float(extra.get("inference_ms", 0.0))
    confidence = float(raw.get("confidence", 0.72))

    # Density-based danger (discrete)
    density_danger = _DENSITY_DANGER.get(density_str, 0.10)

    # Blended danger: density + anomaly spike correction
    raw_danger = density_danger
    if anomaly_detected:
        raw_danger = clamp(raw_danger + 0.25)

    # Cross-validate against safety_score from the pipeline (0-100, higher=safer)
    score_danger = normalize_score(100.0 - safety_score, 0.0, 100.0)
    
    # Weighted blend: 60% pipeline safety score, 40% density signal
    danger_score = clamp(0.60 * score_danger + 0.40 * raw_danger)

    return {
        "person_count": person_count,
        "crowd_density": density_str,
        "density_danger": round(density_danger, 4),
        "anomaly_detected": anomaly_detected,
        "anomalies": anomalies,
        "safety_score": safety_score,
        "danger_score": round(danger_score, 4),
        "danger_level": score_to_level(danger_score),
        "confidence": round(confidence, 4),
        "inference_ms": inference_ms,
        "loader_status": status,
    }


def reset_pipeline() -> None:
    """
    Resets the CV pipeline's internal state (anomaly history, frame buffer).
    Call this between camera sessions or when switching camera feeds.
    """
    bundle = get_cv_bundle()
    try:
        if "reset_fn" in bundle:
            bundle["reset_fn"]()
            logger.info("CV pipeline state reset successfully.")
        else:
            logger.warning("CV bundle missing 'reset_fn' hook.")
    except Exception as exc:
        logger.warning("CV reset_fn raised an exception: %s", exc)


def get_cv_danger_score(image_bytes: bytes) -> float:
    """
    Convenience method: returns only the danger score [0.0, 1.0] for a frame.
    Used by the danger aggregator when it only needs the scalar signal.
    Returns 0.5 on any error.
    """
    try:
        return analyze_frame(image_bytes)["danger_score"]
    except Exception as exc:
        logger.warning("get_cv_danger_score failed: %s — falling back to 0.5", exc)
        return 0.5


# ── Internal helpers ──────────────────────────────────────────────────────────

def _error_result(reason: str, status: str) -> dict[str, Any]:
    return {
        "person_count": 0,
        "crowd_density": "LOW",
        "density_danger": 0.0,
        "anomaly_detected": False,
        "anomalies": [],
        "safety_score": 50,
        "danger_score": 0.5,
        "danger_level": "moderate",
        "confidence": 0.0,
        "inference_ms": 0.0,
        "loader_status": status,
        "error": reason,
    }
