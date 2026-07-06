"""
Voice Feature Extraction Service
Extracts acoustic features from audio files for emotional detection.
"""

import io
from typing import Dict, Optional

# Try to import librosa and numpy, but handle gracefully if not available
try:
    import numpy as np
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("Warning: librosa not installed. Voice feature extraction will return zeros.")


def extract_voice_features(audio_file, transcript: str = "") -> Dict[str, float]:
    """
    Extract acoustic features from audio file.
    
    Args:
        audio_file: Django UploadedFile or file-like object
        transcript: Transcribed text for speech rate calculation
        
    Returns:
        dict: {
            "pitch": float (mean F0 in Hz),
            "energy": float (normalized RMS 0-1),
            "speech_rate": float (words per second),
            "pause_ratio": float (0-1, silence percentage)
        }
    """
    try:
        # Read audio file content
        audio_content = audio_file.read()
        audio_file.seek(0)  # Reset file pointer for potential reuse
        
        # Load audio with librosa (supports WAV, MP3, OGG, FLAC, etc.)
        # WebM may not be supported, so we catch format errors
        try:
            audio_data, sample_rate = librosa.load(
                io.BytesIO(audio_content),
                sr=None,  # Keep original sample rate
                mono=True  # Convert to mono
            )
            
            # Get audio duration
            duration = librosa.get_duration(y=audio_data, sr=sample_rate)
        except Exception as format_error:
            # If audio format not recognized (e.g., WebM), return zero features
            print(f"Audio format not recognized, returning zero features: {format_error}")
            return {
                "pitch": 0.0,
                "energy": 0.0,
                "speech_rate": 0.0,
                "pause_ratio": 0.0
            }
        
        if duration == 0:
            return {
                "pitch": 0.0,
                "energy": 0.0,
                "speech_rate": 0.0,
                "pause_ratio": 0.0
            }
        
        # ------------------------
        # 1. PITCH (F0) EXTRACTION
        # ------------------------
        pitch = _extract_pitch(audio_data, sample_rate)
        
        # ------------------------
        # 2. ENERGY (RMS)
        # ------------------------
        energy = _extract_energy(audio_data)
        
        # ------------------------
        # 3. SPEECH RATE
        # ------------------------
        speech_rate = _calculate_speech_rate(transcript, duration)
        
        # ------------------------
        # 4. PAUSE RATIO
        # ------------------------
        pause_ratio = _calculate_pause_ratio(audio_data, sample_rate)
        
        return {
            "pitch": round(pitch, 2),
            "energy": round(energy, 3),
            "speech_rate": round(speech_rate, 2),
            "pause_ratio": round(pause_ratio, 3)
        }
        
    except Exception as e:
        print(f"Voice feature extraction error: {e}")
        return {
            "pitch": 0.0,
            "energy": 0.0,
            "speech_rate": 0.0,
            "pause_ratio": 0.0
        }


def _extract_pitch(audio_data, sample_rate: int) -> float:
    """
    Extract mean pitch (fundamental frequency) using a fast zero-crossing method
    instead of librosa.pyin to avoid OOM crashes on small servers.
    """
    if not LIBROSA_AVAILABLE:
        return 0.0
    
    try:
        # Avoid librosa.pyin (causes OOM kills on free tier servers)
        # We can use a lightweight zero-crossing rate approximation
        zcr = librosa.feature.zero_crossing_rate(audio_data)[0]
        if len(zcr) == 0:
            return 0.0
            
        # Very rough approximation of pitch from ZCR for prototype purposes
        # ZCR = 2 * F0 / sr  => F0 = ZCR * sr / 2
        mean_zcr = np.mean(zcr)
        approx_pitch = float(mean_zcr * sample_rate / 2)
        
        # Clamp to realistic human voice range (65Hz - 2093Hz)
        return float(np.clip(approx_pitch, 65.0, 2093.0))
        
    except Exception as e:
        print(f"Pitch extraction error: {e}")
        return 0.0


def _extract_energy(audio_data) -> float:
    """
    Extract RMS energy and normalize to 0-1 range.
    
    Returns:
        float: Normalized energy (0-1)
    """
    if not LIBROSA_AVAILABLE:
        return 0.0
    
    try:
        # Calculate RMS energy
        rms = librosa.feature.rms(y=audio_data)[0]
        
        if len(rms) == 0:
            return 0.0
        
        # Get mean RMS
        mean_rms = np.mean(rms)
        
        # Normalize to 0-1 range (typical RMS values are 0-1 for normalized audio)
        # Clamp to ensure 0-1 range
        normalized_energy = min(max(float(mean_rms), 0.0), 1.0)
        
        return normalized_energy
        
    except Exception as e:
        print(f"Energy extraction error: {e}")
        return 0.0


def _calculate_speech_rate(transcript: str, duration: float) -> float:
    """
    Calculate speech rate (words per second).
    
    Args:
        transcript: Transcribed text
        duration: Audio duration in seconds
        
    Returns:
        float: Words per second (0 if no transcript or duration)
    """
    try:
        if not transcript or duration <= 0:
            return 0.0
        
        # Count words (split by whitespace)
        word_count = len(transcript.split())
        
        # Calculate words per second
        speech_rate = word_count / duration
        
        return speech_rate
        
    except Exception as e:
        print(f"Speech rate calculation error: {e}")
        return 0.0


def _calculate_pause_ratio(audio_data, sample_rate: int, 
                           threshold_db: float = -40.0) -> float:
    """
    Calculate ratio of silence in audio.
    
    Args:
        audio_data: Audio time series
        sample_rate: Sample rate
        threshold_db: Silence threshold in dB (default: -40 dB)
        
    Returns:
        float: Pause ratio (0-1, where 1 = all silence)
    """
    if not LIBROSA_AVAILABLE:
        return 0.0
    
    try:
        # Calculate RMS energy in dB
        rms = librosa.feature.rms(y=audio_data)[0]
        
        if len(rms) == 0:
            return 0.0
        
        # Convert to dB
        rms_db = librosa.amplitude_to_db(rms, ref=np.max(rms))
        
        # Count silent frames (below threshold)
        silent_frames = np.sum(rms_db < threshold_db)
        total_frames = len(rms_db)
        
        if total_frames == 0:
            return 0.0
        
        # Calculate pause ratio
        pause_ratio = silent_frames / total_frames
        
        # Clamp to 0-1
        return min(max(float(pause_ratio), 0.0), 1.0)
        
    except Exception as e:
        print(f"Pause ratio calculation error: {e}")
        return 0.0
