import math
import numpy as np
import pytest
from app.engine.features import compute_window_features
from app.engine.fft import compute_fft_features
from app.engine.health_index import HealthIndexCalculator
from app.engine.validation import convert_units, detect_flatline, detect_spike

def test_golden_statistical_features():
    # Fixed known sequence: [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
    # Sum = 40, N = 8, Mean = 5.0
    # Squares: 4, 16, 16, 16, 25, 25, 49, 81 -> Sum = 232 -> Mean = 29 -> RMS = sqrt(29) ≈ 5.3852
    # Min = 2.0, Max = 9.0, P2P = 7.0
    # Max abs = 9.0 -> Crest factor = 9.0 / sqrt(29) ≈ 1.6713
    data = np.array([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])
    feats = compute_window_features(data, prefix="test")

    assert feats["test_mean"] == 5.0
    assert abs(feats["test_rms"] - math.sqrt(29.0)) < 1e-3
    assert feats["test_min"] == 2.0
    assert feats["test_max"] == 9.0
    assert feats["test_p2p"] == 7.0
    assert abs(feats["test_crest"] - (9.0 / math.sqrt(29.0))) < 1e-3
    assert feats["test_slope"] > 0.0 # Clear positive slope

def test_golden_fft_dominant_frequency():
    # 50 Hz sine wave sampled at 1000 Hz for 1 second (1000 points)
    t = np.linspace(0.0, 1.0, 1000, endpoint=False)
    sine_wave = np.sin(2.0 * np.pi * 50.0 * t)

    fft_res = compute_fft_features(sine_wave, sampling_rate_hz=1000.0, prefix="vib")
    assert abs(fft_res["vib_fft_dom_freq"] - 50.0) < 1.0
    assert fft_res["vib_fft_band1_energy"] > 0.0

def test_golden_health_index_baseline():
    calc = HealthIndexCalculator(n_components=2)
    # Healthy baseline: random normal around mean 0
    np.random.seed(42)
    baseline = np.random.normal(loc=0.0, scale=1.0, size=(100, 5))
    calc.fit_baseline(baseline)

    # A vector close to baseline mean should have health index close to 100
    mean_vec = np.zeros((1, 5))
    hi, state = calc.calculate_health_index(mean_vec)
    assert hi >= 95.0
    assert state == "Healthy"

    # Extreme anomalous vector should have low health index
    outlier = np.array([[15.0, 20.0, -18.0, 25.0, 30.0]])
    hi_outlier, state_outlier = calc.calculate_health_index(outlier)
    assert hi_outlier < 30.0
    assert state_outlier in ["Alert", "Critical"]

def test_golden_unit_conversions():
    # 212 °F == 100 °C
    assert abs(convert_units(212.0, "°F", "°C") - 100.0) < 1e-2
    # 32 °F == 0 °C
    assert abs(convert_units(32.0, "°F", "°C") - 0.0) < 1e-2
    # 1 in/s == 25.4 mm/s
    assert abs(convert_units(1.0, "in/s", "mm/s") - 25.4) < 1e-3
    # 14.5038 psi ≈ 1.0 bar
    assert abs(convert_units(14.5038, "psi", "bar") - 1.0) < 1e-2

def test_spike_and_flatline():
    flat_series = [5.0] * 12
    assert detect_flatline(flat_series) is True

    normal_history = [2.0, 2.1, 2.05, 1.95, 2.02, 2.01, 1.99]
    assert detect_spike(25.0, normal_history) is True
    assert detect_spike(2.05, normal_history) is False
