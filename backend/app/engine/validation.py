from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

PLAUSIBLE_RANGES = {
    "vibration": (0.0, 50.0),       # mm/s RMS (ISO 10816)
    "temperature": (-20.0, 150.0),  # °C
    "current": (0.0, 250.0),        # A
    "pressure": (0.0, 50.0),        # bar
    "speed": (0.0, 5000.0)          # rpm
}

def parse_and_utc_timestamp(ts_input: Any) -> datetime:
    """Parse timestamp and normalize to UTC."""
    if isinstance(ts_input, datetime):
        if ts_input.tzinfo is None:
            return ts_input.replace(tzinfo=timezone.utc)
        return ts_input.astimezone(timezone.utc)
    
    if isinstance(ts_input, (int, float)):
        # Epoch seconds or milliseconds
        if ts_input > 1e11:
            ts_input = ts_input / 1000.0
        return datetime.fromtimestamp(ts_input, tz=timezone.utc)

    if isinstance(ts_input, str):
        cleaned = ts_input.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M", "%m/%d/%Y %H:%M:%S", "%Y/%m/%d %H:%M"):
                try:
                    dt = datetime.strptime(cleaned, fmt)
                    return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
    raise ValueError(f"Cannot parse timestamp: {ts_input}")

def convert_units(value: float, from_unit: str, to_unit: str) -> float:
    """Standard industrial unit conversions."""
    fu = from_unit.strip().lower()
    tu = to_unit.strip().lower()
    if fu == tu:
        return value
    # Temperature
    if fu in ["f", "°f", "degf"] and tu in ["c", "°c", "degc"]:
        return (value - 32.0) * (5.0 / 9.0)
    # Vibration velocity
    if fu in ["in/s", "ips"] and tu in ["mm/s"]:
        return value * 25.4
    # Pressure
    if fu in ["psi"] and tu in ["bar"]:
        return value * 0.0689476
    return value

def detect_flatline(values: List[float], min_samples: int = 6, variance_tol: float = 1e-5) -> bool:
    """Check if sensor readings have flatlined / stuck with near zero variance."""
    if len(values) < min_samples:
        return False
    var = float(np.var(values[-min_samples:]))
    return var < variance_tol

def detect_spike(val: float, history: List[float], threshold: float = 4.5) -> bool:
    """Detect outlier spike using robust Median Absolute Deviation (MAD)."""
    if len(history) < 5:
        return False
    median = float(np.median(history))
    mad = float(np.median(np.abs(np.array(history) - median)))
    if mad < 1e-6:
        return abs(val - median) > 5.0
    robust_z = abs(val - median) / (1.4826 * mad)
    return robust_z > threshold

def validate_reading_point(
    sensor_type: str,
    value: float,
    unit: str,
    history: Optional[List[float]] = None
) -> Tuple[bool, str, float]:
    """
    Validate a single sensor reading.
    Returns: (is_valid, issue_reason, converted_value)
    """
    conv_val = value
    st = sensor_type.lower()
    
    # Check unit conversion
    if st == "temperature" and unit.lower() in ["f", "°f", "degf"]:
        conv_val = convert_units(value, "°f", "°c")
    elif st == "vibration" and unit.lower() in ["in/s", "ips"]:
        conv_val = convert_units(value, "in/s", "mm/s")
    elif st == "pressure" and unit.lower() in ["psi"]:
        conv_val = convert_units(value, "psi", "bar")

    # Plausible range
    if st in PLAUSIBLE_RANGES:
        min_p, max_p = PLAUSIBLE_RANGES[st]
        if conv_val < min_p or conv_val > max_p:
            return False, f"{sensor_type} value {conv_val:.2f} out of plausible bounds [{min_p}, {max_p}]", conv_val

    # Spike test
    if history and len(history) >= 5 and detect_spike(conv_val, history):
        return False, f"Spike anomaly detected (value: {conv_val:.2f})", conv_val

    return True, "valid", conv_val
