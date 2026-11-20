import math
from typing import Any, Dict, List, Optional
import numpy as np
import scipy.stats as stats

def compute_window_features(
    series: np.ndarray,
    feature_prefix: str = "sensor",
    prefix: Optional[str] = None
) -> Dict[str, float]:
    """
    Compute statistical and vibration signal features for a look-back sliding window.
    Strictly past data only (no future leakage).
    """
    if prefix is not None:
        feature_prefix = prefix
    features: Dict[str, float] = {}
    if len(series) == 0:
        return features

    clean = series[~np.isnan(series)]
    if len(clean) == 0:
        return features

    # Basic stats
    mean_val = float(np.mean(clean))
    std_val = float(np.std(clean, ddof=1)) if len(clean) > 1 else 0.0
    min_val = float(np.min(clean))
    max_val = float(np.max(clean))
    peak_to_peak = max_val - min_val

    # RMS & Crest Factor
    rms = float(np.sqrt(np.mean(clean ** 2)))
    crest_factor = float(np.max(np.abs(clean)) / (rms + 1e-9))

    # Skewness & Kurtosis
    if len(clean) >= 4 and std_val > 1e-6:
        skew_val = float(stats.skew(clean))
        kurt_val = float(stats.kurtosis(clean)) # Fisher excess (normal = 0)
    else:
        skew_val = 0.0
        kurt_val = 0.0

    # Linear slope across window
    if len(clean) > 2:
        x_axis = np.arange(len(clean), dtype=float)
        slope, _, _, _, _ = stats.linregress(x_axis, clean)
        slope_val = float(slope)
    else:
        slope_val = 0.0

    # Rate of change
    roc = float((clean[-1] - clean[0]) / max(len(clean) - 1, 1))

    features[f"{feature_prefix}_mean"] = round(mean_val, 4)
    features[f"{feature_prefix}_std"] = round(std_val, 4)
    features[f"{feature_prefix}_min"] = round(min_val, 4)
    features[f"{feature_prefix}_max"] = round(max_val, 4)
    features[f"{feature_prefix}_p2p"] = round(peak_to_peak, 4)
    features[f"{feature_prefix}_rms"] = round(rms, 4)
    features[f"{feature_prefix}_crest"] = round(crest_factor, 4)
    features[f"{feature_prefix}_skew"] = round(skew_val, 4)
    features[f"{feature_prefix}_kurt"] = round(kurt_val, 4)
    features[f"{feature_prefix}_slope"] = round(slope_val, 6)
    features[f"{feature_prefix}_roc"] = round(roc, 6)

    return features

def compute_cross_features(
    temperature: float,
    current: float,
    vibration: float,
    speed: float
) -> Dict[str, float]:
    """Calculate cross-sensor ratio and load-normalized features."""
    return {
        "temp_per_amp": round(temperature / (current + 1e-3), 4),
        "vib_per_speed": round(vibration / (speed + 1e-3), 6)
    }
