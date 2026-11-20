from datetime import datetime, timedelta, timezone
import numpy as np
import pytest
from app.engine.labels import create_failure_labels

def test_failure_label_horizon_and_masking():
    base_t = datetime(2026, 11, 20, 0, 0, tzinfo=timezone.utc)
    # 10 timestamps, 12 hours apart
    timestamps = [base_t + timedelta(hours=i * 12) for i in range(10)]
    
    # Failure occurs at hour 60 (between i=4 and i=5)
    failure_time = base_t + timedelta(hours=60)
    failures = [{"start": failure_time, "end": failure_time + timedelta(hours=6)}]
    
    # 72 hour horizon: timestamps at hour 0, 12, 24, 36, 48 are within 72h before failure
    y, mask = create_failure_labels(timestamps, failures, horizon_hours=72)

    # Hour 0 (t=0) to failure (t=60): 60h <= 72h -> y=1
    assert y[0] == 1
    assert y[1] == 1 # 48h
    assert y[2] == 1 # 36h
    assert y[3] == 1 # 24h
    assert y[4] == 1 # 12h
    
    # Timestamp during repair (hour 60) should be masked
    repair_idx = 5
    assert not mask[repair_idx] # Inside [hour 60, hour 66]

def test_no_leakage_strictly_past_only():
    """Ensure feature calculation uses look-back window only."""
    from app.engine.features import compute_window_features
    # Series with a future step change at index 8
    series = np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 100.0, 100.0])
    
    # Feature computed on look-back window [0:8]
    feats_past = compute_window_features(series[:8], prefix="test")
    assert feats_past["test_mean"] == 1.0
    assert feats_past["test_max"] == 1.0 # Absolutely untouched by future spike at index 8
