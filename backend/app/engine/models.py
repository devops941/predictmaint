from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression

class BaseModelEngine:
    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> None:
        raise NotImplementedError

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        raise NotImplementedError

class BaselineRuleModel(BaseModelEngine):
    """Fixed-threshold rule model on key vibration & temp sensors."""
    def __init__(self, vib_idx: int = 0, temp_idx: int = 1, vib_thresh: float = 7.1, temp_thresh: float = 85.0):
        self.vib_idx = vib_idx
        self.temp_idx = temp_idx
        self.vib_thresh = vib_thresh
        self.temp_thresh = temp_thresh

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> None:
        pass

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        n = len(X)
        probs = np.zeros(n)
        for i in range(n):
            vib = X[i, self.vib_idx] if self.vib_idx < X.shape[1] else 0.0
            temp = X[i, self.temp_idx] if self.temp_idx < X.shape[1] else 0.0
            if vib > self.vib_thresh or temp > self.temp_thresh:
                probs[i] = min(0.95, 0.5 + (vib / 15.0) * 0.4)
            else:
                probs[i] = max(0.05, (vib / self.vib_thresh) * 0.3)
        return probs

class ControlChartModel(BaseModelEngine):
    """Shewhart / EWMA control chart on primary sensor signal."""
    def __init__(self, key_idx: int = 0, k_sigma: float = 3.0):
        self.key_idx = key_idx
        self.k_sigma = k_sigma
        self.mean: float = 0.0
        self.std: float = 1.0

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> None:
        if len(X) > 0:
            vals = X[:, self.key_idx] if self.key_idx < X.shape[1] else X[:, 0]
            self.mean = float(np.mean(vals))
            self.std = max(float(np.std(vals)), 1e-4)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        vals = X[:, self.key_idx] if self.key_idx < X.shape[1] else X[:, 0]
        z = (vals - self.mean) / self.std
        # Probability scales with z beyond 2 sigma
        probs = 1.0 / (1.0 + np.exp(-1.2 * (z - self.k_sigma)))
        return np.clip(probs, 0.0, 1.0)

class IsolationForestEngine(BaseModelEngine):
    """Unsupervised anomaly detection via Isolation Forest."""
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.model = IsolationForest(contamination=contamination, random_state=random_state, n_estimators=100)

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> None:
        self.model.fit(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        # Decision function: lower values mean more anomalous
        scores = self.model.decision_function(X)
        # Invert and scale to [0, 1]
        probs = 1.0 / (1.0 + np.exp(4.0 * scores))
        return probs

class SupervisedClassifierEngine(BaseModelEngine):
    """Supervised models: Logistic Regression, Random Forest, HistGB with class balancing."""
    def __init__(self, family: str = "random_forest", random_state: int = 42):
        self.family = family
        if family == "logistic_regression":
            self.model = LogisticRegression(class_weight="balanced", max_iter=500, random_state=random_state)
        elif family == "hist_gradient_boosting":
            self.model = HistGradientBoostingClassifier(class_weight="balanced", random_state=random_state)
        else: # random_forest
            self.model = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=random_state)

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> None:
        if y is None or len(np.unique(y)) < 2:
            # Fallback if single class
            return
        self.model.fit(X, y)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        try:
            proba = self.model.predict_proba(X)
            return proba[:, 1]
        except Exception:
            return np.zeros(len(X))

def estimate_rul_hours(health_history: List[Tuple[float, float]], fail_threshold: float = 25.0) -> Tuple[float, float, float]:
    """
    Extrapolate degradation trend of health index down to failure threshold.
    Returns: (indicative_rul_hours, lower_ci, upper_ci)
    """
    if len(health_history) < 3:
        return 720.0, 500.0, 1000.0  # Default ~30 days if new

    times = np.array([pt[0] for pt in health_history])
    health = np.array([pt[1] for pt in health_history])
    current_hi = health[-1]

    if current_hi <= fail_threshold:
        return 0.0, 0.0, 4.0

    # Fit linear slope: health = slope * t + intercept
    slope, intercept = np.polyfit(times, health, 1)

    if slope >= -1e-4:
        # Not currently degrading significantly
        return 720.0, 480.0, 1200.0

    # Remaining hours until health reaches fail_threshold
    hours_to_fail = (fail_threshold - current_hi) / slope
    hours_to_fail = max(0.0, float(hours_to_fail))
    lower_ci = max(0.0, hours_to_fail * 0.75)
    upper_ci = hours_to_fail * 1.35
    return round(hours_to_fail, 1), round(lower_ci, 1), round(upper_ci, 1)
