import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from app.engine.validation import PLAUSIBLE_RANGES, convert_units, detect_spike, parse_and_utc_timestamp

def scan_dataset(
    df: pd.DataFrame,
    kind: str = "readings",
    column_mapping: Optional[Dict[str, str]] = None,
    units: Optional[Dict[str, str]] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Perform deep industrial data validation scan on uploaded dataframe.
    Returns: (list_of_issues, summary_counts)
    """
    issues: List[Dict[str, Any]] = []
    mapping = column_mapping or {}
    units_map = units or {}

    total_rows = len(df)
    fail_rows = set()
    warn_rows = set()

    # Normalize mapped columns
    col_ts = mapping.get("timestamp", "timestamp") if "timestamp" in df.columns or "ts" in df.columns else None
    if not col_ts:
        for c in df.columns:
            if "time" in c.lower() or "date" in c.lower() or c.lower() == "ts":
                col_ts = c
                break

    if not col_ts or col_ts not in df.columns:
        issues.append({
            "id": "err_no_ts",
            "row_idx": 0,
            "column": "timestamp",
            "issue_type": "invalid_format",
            "severity": "fail",
            "description": "Missing required timestamp column in uploaded file.",
            "proposed_fix": "Map a timestamp column in column mapping.",
            "applied": False
        })
        return issues, {"total": total_rows, "valid": 0, "warn": 0, "fail": total_rows}

    # 1. Check timestamps and clock drift
    parsed_times: List[Optional[datetime]] = []
    now = datetime.now(timezone.utc)
    for idx, raw_val in enumerate(df[col_ts]):
        try:
            dt = parse_and_utc_timestamp(raw_val)
            parsed_times.append(dt)
            # Clock drift hint: timestamps far into future (>24h)
            if dt > now + timedelta(hours=24):
                warn_rows.add(idx)
                issues.append({
                    "id": f"drift_{idx}",
                    "row_idx": idx,
                    "column": col_ts,
                    "issue_type": "clock_drift",
                    "severity": "warn",
                    "description": f"Timestamp {dt.isoformat()} is ahead of server time.",
                    "proposed_fix": "Offset timestamp to match plant UTC clock.",
                    "applied": False
                })
        except Exception:
            parsed_times.append(None)
            fail_rows.add(idx)
            issues.append({
                "id": f"ts_parse_{idx}",
                "row_idx": idx,
                "column": col_ts,
                "issue_type": "invalid_format",
                "severity": "fail",
                "description": f"Cannot parse timestamp '{raw_val}'.",
                "proposed_fix": "Format timestamp to ISO-8601 or YYYY-MM-DD HH:MM:SS.",
                "applied": False
            })

    # 2. Check value columns (vibration, temp, current, pressure, speed)
    numeric_cols = [c for c in df.columns if c != col_ts and pd.api.types.is_numeric_dtype(df[c])]

    for col in numeric_cols:
        col_lower = col.lower()
        sensor_type = "unknown"
        if "vib" in col_lower:
            sensor_type = "vibration"
        elif "temp" in col_lower:
            sensor_type = "temperature"
        elif "curr" in col_lower or "amp" in col_lower:
            sensor_type = "current"
        elif "press" in col_lower or "bar" in col_lower or "psi" in col_lower:
            sensor_type = "pressure"
        elif "speed" in col_lower or "rpm" in col_lower:
            sensor_type = "speed"

        unit = units_map.get(col, "")
        vals = df[col].values

        # Check unit mismatch (°F instead of °C, psi instead of bar)
        if sensor_type == "temperature" and (unit.lower() in ["f", "°f"] or np.nanmean(vals) > 130):
            warn_rows.update(range(min(5, total_rows)))
            issues.append({
                "id": f"unit_{col}",
                "row_idx": 0,
                "column": col,
                "issue_type": "unit_mismatch",
                "severity": "warn",
                "description": f"Column '{col}' appears to be in Fahrenheit (°F). System standard is Celsius (°C).",
                "proposed_fix": "Apply automatic °F to °C conversion: (°F - 32) * 5/9",
                "applied": False
            })

        # Plausible range checks
        if sensor_type in PLAUSIBLE_RANGES:
            min_bound, max_bound = PLAUSIBLE_RANGES[sensor_type]
            outliers = np.where((vals < min_bound) | (vals > max_bound))[0]
            for row_i in outliers[:5]: # report up to 5 examples
                fail_rows.add(int(row_i))
                issues.append({
                    "id": f"range_{col}_{row_i}",
                    "row_idx": int(row_i),
                    "column": col,
                    "issue_type": "plausible_range",
                    "severity": "fail",
                    "description": f"Value {vals[row_i]} in '{col}' exceeds plausible bounds [{min_bound}, {max_bound}].",
                    "proposed_fix": "Clamp to maximum or flag as faulty sensor.",
                    "applied": False
                })

        # Flatline / Stuck sensor check
        valid_vals = vals[~np.isnan(vals)]
        if len(valid_vals) >= 10 and float(np.var(valid_vals)) < 1e-6:
            warn_rows.update(range(min(10, total_rows)))
            issues.append({
                "id": f"flatline_{col}",
                "row_idx": 0,
                "column": col,
                "issue_type": "flatline",
                "severity": "warn",
                "description": f"Sensor '{col}' shows zero variance across all readings (flatline / stuck sensor).",
                "proposed_fix": "Flag sensor data as doubtful / needs field inspection.",
                "applied": False
            })

        # Gaps / Missing values
        nan_indices = np.where(np.isnan(vals))[0]
        if len(nan_indices) > 0:
            for r_idx in nan_indices[:5]:
                warn_rows.add(int(r_idx))
            issues.append({
                "id": f"gap_{col}",
                "row_idx": int(nan_indices[0]),
                "column": col,
                "issue_type": "gap",
                "severity": "warn",
                "description": f"{len(nan_indices)} missing value gaps detected in column '{col}'.",
                "proposed_fix": "Linear interpolation for short gaps (<= 3 steps) and mark imputed.",
                "applied": False
            })

    # Summary counts
    total_fails = len(fail_rows)
    total_warns = len(warn_rows - fail_rows)
    total_valid = total_rows - (total_fails + total_warns)

    counts = {
        "total": total_rows,
        "valid": max(0, total_valid),
        "warn": total_warns,
        "fail": total_fails
    }
    return issues, counts

def compute_checksum(content_bytes: bytes) -> str:
    """Compute SHA-256 checksum of uploaded file content."""
    return hashlib.sha256(content_bytes).hexdigest()
