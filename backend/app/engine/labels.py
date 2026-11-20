from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

def create_failure_labels(
    timestamps: List[datetime],
    failure_events: List[Dict[str, Any]],
    horizon_hours: int = 72,
    repair_events: Optional[List[Dict[str, Any]]] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate ground-truth binary labels y without data leakage.
    y = 1 if a failure starts within (t, t + horizon_hours].
    Also returns a mask indicating valid (non-repair, non-masked) samples.
    """
    n = len(timestamps)
    y = np.zeros(n, dtype=int)
    valid_mask = np.ones(n, dtype=bool)

    if n == 0:
        return y, valid_mask

    horizon_delta = timedelta(hours=horizon_hours)

    # Normalize failure times
    failure_starts = []
    for f in failure_events:
        st = f.get("start")
        if isinstance(st, str):
            st = datetime.fromisoformat(st.replace("Z", "+00:00"))
        if st.tzinfo is None:
            st = st.replace(tzinfo=timezone.utc)
        failure_starts.append(st)

    # Maintenance/repair windows to mask out
    repair_windows = []
    events_to_check = (repair_events or []) + failure_events
    for ev in events_to_check:
        st = ev.get("start")
        et = ev.get("end")
        if st and et:
            if isinstance(st, str):
                st = datetime.fromisoformat(st.replace("Z", "+00:00"))
            if isinstance(et, str):
                et = datetime.fromisoformat(et.replace("Z", "+00:00"))
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            if et.tzinfo is None:
                et = et.replace(tzinfo=timezone.utc)
            repair_windows.append((st, et))

    for i, t in enumerate(timestamps):
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)

        # Check if t falls inside any ongoing repair window -> mask out
        in_repair = any(st <= t <= et for st, et in repair_windows)
        if in_repair:
            valid_mask[i] = False
            continue

        # Check if any failure starts within (t, t + horizon_delta]
        horizon_end = t + horizon_delta
        has_failure = any(t < f_start <= horizon_end for f_start in failure_starts)
        if has_failure:
            y[i] = 1

    return y, valid_mask
