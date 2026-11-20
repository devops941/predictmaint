from typing import Any, Dict, List, Tuple
import numpy as np

def sweep_cost_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    cost_miss: float = 50000.0,
    cost_false: float = 2000.0,
    inspection_cost: float = 500.0
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """
    Sweep classification threshold to find the cost-optimal decision threshold:
    Cost = C_miss * FN + C_false * FP + inspection_cost * (TP + FP)
    """
    thresholds = np.linspace(0.05, 0.95, 37)
    best_cost = float("inf")
    best_threshold = 0.5
    curve: List[Dict[str, Any]] = []

    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        
        cost = (cost_miss * fn) + (cost_false * fp) + (inspection_cost * (tp + fp))
        curve.append({
            "threshold": round(float(t), 2),
            "cost": round(float(cost), 2),
            "fn_count": fn,
            "fp_count": fp,
            "tp_count": tp
        })

        if cost < best_cost:
            best_cost = cost
            best_threshold = float(t)

    return round(best_threshold, 2), round(best_cost, 2), curve
