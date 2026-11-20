from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

def resample_time_series(
    readings: List[Dict[str, Any]],
    window_minutes: int = 10,
    agg_method: str = "mean",
    max_impute_steps: int = 3
) -> pd.DataFrame:
    """
    Resample time series readings to a fixed time step grid.
    Fills short gaps up to max_impute_steps linearly, marking imputed points.
    """
    if not readings:
        return pd.DataFrame()

    df = pd.DataFrame(readings)
    if "ts" not in df.columns:
        return pd.DataFrame()

    df["ts"] = pd.to_datetime(df["ts"], utc=True)
    df = df.sort_values("ts")
    
    # Pivot so each sensor has its own column
    if "sensor_id" in df.columns and "value" in df.columns:
        pivoted = df.pivot_table(index="ts", columns="sensor_id", values="value", aggfunc=agg_method)
    else:
        pivoted = df.set_index("ts")

    # Resample to fixed window frequency
    freq = f"{window_minutes}min"
    resampled = pivoted.resample(freq).agg(agg_method)
    
    # Linear interpolation up to max_impute_steps
    interpolated = resampled.interpolate(method="linear", limit=max_impute_steps)
    return interpolated

def tag_operating_condition(
    speed_rpm: float,
    current_amps: float,
    rated_current: float = 100.0
) -> str:
    """Tag machine operational mode: idle, running, or high_load."""
    if speed_rpm < 100.0 or current_amps < 5.0:
        return "idle"
    if current_amps > (0.85 * rated_current):
        return "high_load"
    return "running"
