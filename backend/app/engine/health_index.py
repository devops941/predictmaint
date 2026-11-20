from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

class HealthIndexCalculator:
    """
    Computes machine Health Index (0-100) using PCA reconstruction error
    from a healthy baseline operation period.
    """
    def __init__(self, n_components: int = 3):
        self.n_components = n_components
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=n_components)
        self.baseline_max_error: float = 1.0
        self.is_fitted: bool = False

    def fit_baseline(self, baseline_features: np.ndarray) -> None:
        """Fit on healthy baseline feature matrix."""
        if len(baseline_features) < self.n_components + 1:
            # Fallback if few samples
            self.is_fitted = False
            return
        
        scaled = self.scaler.fit_transform(baseline_features)
        components = min(self.n_components, scaled.shape[1], scaled.shape[0])
        self.pca = PCA(n_components=components)
        transformed = self.pca.fit_transform(scaled)
        reconstructed = self.pca.inverse_transform(transformed)
        errors = np.mean((scaled - reconstructed) ** 2, axis=1)
        
        # Set 99th percentile of baseline error as reference upper bound for healthy
        self.baseline_max_error = max(float(np.percentile(errors, 99)), 1e-4)
        self.is_fitted = True

    def calculate_health_index(self, feature_vector: np.ndarray) -> Tuple[float, str]:
        """
        Calculate health index (0 to 100) and state (Healthy, Watch, Alert, Critical).
        """
        if not self.is_fitted or feature_vector.ndim == 0:
            return 100.0, "Healthy"

        if feature_vector.ndim == 1:
            feature_vector = feature_vector.reshape(1, -1)

        scaled = self.scaler.transform(feature_vector)
        transformed = self.pca.transform(scaled)
        reconstructed = self.pca.inverse_transform(transformed)
        error = float(np.mean((scaled - reconstructed) ** 2))

        # Map error to 0-100 scale: error <= 0.5*baseline_max -> 100, error >= 3*baseline_max -> 0
        ratio = error / self.baseline_max_error
        # Exponential degradation curve
        hi = 100.0 * np.exp(-0.7 * max(0.0, ratio - 0.5))
        hi = float(np.clip(hi, 0.0, 100.0))

        if hi >= 75.0:
            state = "Healthy"
        elif hi >= 50.0:
            state = "Watch"
        elif hi >= 25.0:
            state = "Alert"
        else:
            state = "Critical"

        return round(hi, 1), state
