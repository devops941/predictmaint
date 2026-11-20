from typing import Dict, Tuple
import numpy as np

def compute_fft_features(
    signal: np.ndarray,
    sampling_rate_hz: float = 1000.0,
    prefix: str = "vib"
) -> Dict[str, float]:
    """
    Compute FFT dominant frequency and band energies from high-rate vibration signal.
    """
    n = len(signal)
    if n < 4:
        return {
            f"{prefix}_fft_dom_freq": 0.0,
            f"{prefix}_fft_band1_energy": 0.0,
            f"{prefix}_fft_band2_energy": 0.0
        }

    # Remove DC component
    centered = signal - np.mean(signal)
    
    # Real FFT
    fft_vals = np.abs(np.fft.rfft(centered))
    fft_freqs = np.fft.rfftfreq(n, d=1.0 / sampling_rate_hz)

    # Dominant frequency
    dom_idx = int(np.argmax(fft_vals[1:])) + 1 if len(fft_vals) > 1 else 0
    dom_freq = float(fft_freqs[dom_idx]) if dom_idx < len(fft_freqs) else 0.0

    # Low band (0-200 Hz: unbalance, misalignment, looseness)
    mask_low = (fft_freqs >= 10.0) & (fft_freqs < 200.0)
    band1_energy = float(np.sum(fft_vals[mask_low] ** 2))

    # High band (200-2000 Hz: bearing inner/outer race pass, gear mesh)
    mask_high = (fft_freqs >= 200.0) & (fft_freqs < 2000.0)
    band2_energy = float(np.sum(fft_vals[mask_high] ** 2))

    return {
        f"{prefix}_fft_dom_freq": round(dom_freq, 2),
        f"{prefix}_fft_band1_energy": round(band1_energy, 4),
        f"{prefix}_fft_band2_energy": round(band2_energy, 4)
    }
