"""
Spatial clustering of incidents and danger zones.
Uses DBSCAN via scikit-learn with Haversine distance for production accuracy.
"""

import math
import logging
from typing import List, Dict, Any
import numpy as np
from sklearn.cluster import DBSCAN
from custom_db.tigergraph_client import get_all_zones

logger = logging.getLogger(__name__)

SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}

async def compute_clusters(
    min_size: int = 2,
    radius_km: float = 0.5,
    hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Groups zones into spatial clusters using DBSCAN with a Haversine metric.
    Maintains the exact same input parameters and output JSON structure.
    """
    zones = await get_all_zones(limit=10000)
    if not zones:
        return []

    # 1. Extract coordinates and convert them to radians for Haversine
    coords = np.array([[z["lat"], z["lng"]] for z in zones])
    coords_rad = np.radians(coords)

    # Earth's radius in kilometers is roughly 6371.008
    # eps needs to be in radians (radius_km / earth_radius)
    kms_per_radian = 6371.008
    epsilon_rad = radius_km / kms_per_radian

    # 2. Run DBSCAN
    # metric='haversine' expects [lat, lng] in radians if passed this way,
    # or [lng, lat] depending on setup. Because we use standard pairs,
    # it treats index 0 as lat and index 1 as lng consistently.
    db = DBSCAN(eps=epsilon_rad, min_samples=min_size, metric='haversine')
    labels = db.fit_predict(coords_rad)

    # 3. Group zones into their respective clusters based on labels
    cluster_groups: Dict[int, List[dict]] = {}
    for zone, label in zip(zones, labels):
        if label == -1:
            continue  # Noise point, skip it
        cluster_groups.setdefault(label, []).append(zone)

    clusters = []
    
    # 4. Aggregate data for each cluster
    for idx, (label, cell_zones) in enumerate(cluster_groups.items()):
        center_lat = sum(z["lat"] for z in cell_zones) / len(cell_zones)
        center_lng = sum(z["lng"] for z in cell_zones) / len(cell_zones)
        avg_danger = sum(z["danger_score"] for z in cell_zones) / len(cell_zones)

        # Compute dominant severity from incident data
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for z in cell_zones:
            inc_count = z.get("incident_count_24h", 0)
            if inc_count > 10:
                severity_counts["critical"] += 1
            elif inc_count > 5:
                severity_counts["high"] += 1
            elif inc_count > 2:
                severity_counts["medium"] += 1
            else:
                severity_counts["low"] += 1

        dominant = max(severity_counts, key=lambda k: severity_counts[k])

        # Danger level text translation
        if avg_danger < 0.25:
            level = "safe"
        elif avg_danger < 0.50:
            level = "moderate"
        elif avg_danger < 0.75:
            level = "unsafe"
        else:
            level = "critical"

        # Construct the payload matching the original signature contract
        clusters.append({
            "cluster_id": f"cluster_{idx}",
            "center_lat": round(center_lat, 6),
            "center_lng": round(center_lng, 6),
            "zone_count": len(cell_zones),
            "incident_count": sum(z.get("incident_count_24h", 0) for z in cell_zones),
            "avg_danger_score": round(avg_danger, 3),
            "danger_level": level,
            "dominant_severity": dominant,
            "radius_m": int(radius_km * 1000),
            "zone_ids": [z["zone_id"] for z in cell_zones]
        })

    # Sort by danger descending so most unsafe zones bubble to the top
    clusters.sort(key=lambda c: c["avg_danger_score"], reverse=True)
    return clusters
