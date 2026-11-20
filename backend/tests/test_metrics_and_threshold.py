import numpy as np
from app.engine.evaluate import compute_all_metrics
from app.engine.threshold import sweep_cost_threshold

def test_metrics_evaluation():
    y_true = np.array([1, 1, 1, 1, 0, 0, 0, 0])
    y_prob = np.array([0.9, 0.8, 0.7, 0.3, 0.2, 0.1, 0.4, 0.8])
    
    metrics = compute_all_metrics(y_true, y_prob, threshold=0.5)
    # Predicted positives with t>=0.5: indices 0, 1, 2, 7 -> [1, 1, 1, 0]
    # TP = 3 (0, 1, 2), FP = 1 (7), FN = 1 (3), TN = 3 (4, 5, 6)
    assert metrics["tp"] == 3
    assert metrics["fp"] == 1
    assert metrics["fn"] == 1
    assert metrics["tn"] == 3
    assert abs(metrics["precision"] - 0.75) < 1e-3
    assert abs(metrics["recall"] - 0.75) < 1e-3
    assert metrics["pr_auc"] > 0.7

def test_optimal_threshold_sweep():
    # Synthetic ground truth
    y_true = np.array([1, 1, 1, 1, 0, 0, 0, 0, 0, 0])
    y_prob = np.array([0.95, 0.90, 0.85, 0.75, 0.45, 0.30, 0.25, 0.20, 0.15, 0.10])

    best_thresh, min_cost, curve = sweep_cost_threshold(
        y_true, y_prob,
        cost_miss=50000.0,
        cost_false=2000.0,
        inspection_cost=500.0
    )

    assert 0.4 <= best_thresh <= 0.8
    assert min_cost > 0.0
    assert len(curve) > 10
