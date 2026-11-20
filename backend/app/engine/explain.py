from typing import Any, Dict, List
import numpy as np

def explain_alarm_features(
    feature_names: List[str],
    current_values: np.ndarray,
    baseline_means: np.ndarray,
    baseline_stds: np.ndarray,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Produce plain-language explanations of alarm causes:
    Calculates z-score deviation from healthy baseline and relative contribution.
    """
    deviations = []
    total_dev = 0.0

    for i, name in enumerate(feature_names):
        curr = float(current_values[i]) if i < len(current_values) else 0.0
        mean = float(baseline_means[i]) if i < len(baseline_means) else 0.0
        std = max(float(baseline_stds[i]) if i < len(baseline_stds) else 1.0, 1e-4)

        z = (curr - mean) / std
        abs_z = abs(z)
        total_dev += abs_z

        deviations.append({
            "feature": name,
            "sensor": name.split("_")[0].capitalize(),
            "current_value": round(curr, 2),
            "baseline_value": round(mean, 2),
            "deviation_z": round(z, 2),
            "abs_z": abs_z
        })

    # Sort by absolute z-score deviation descending
    deviations.sort(key=lambda x: x["abs_z"], reverse=True)

    results = []
    for item in deviations[:top_k]:
        pct = (item["abs_z"] / total_dev * 100.0) if total_dev > 0 else 33.3
        results.append({
            "feature": item["feature"],
            "sensor": item["sensor"],
            "current_value": item["current_value"],
            "baseline_value": item["baseline_value"],
            "deviation_z": item["deviation_z"],
            "contribution_pct": round(pct, 1)
        })

    return results
