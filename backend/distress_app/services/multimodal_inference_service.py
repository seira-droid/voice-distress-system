"""
Multimodal Emotional Inference Engine
Combines text-based and voice-based signals into unified distress score.
"""

from typing import Dict, Tuple


def compute_multimodal_risk(text_risk_score: float, voice_features: Dict[str, float]) -> Dict:
    """
    Compute unified multimodal risk score by fusing text and voice signals.
    
    Args:
        text_risk_score: Risk score from text analysis (0-100)
        voice_features: Dict with pitch, energy, speech_rate, pause_ratio
        
    Returns:
        dict: {
            "risk_score": float (0-100, unified multimodal score),
            "alert_triggered": bool (true if >= 70),
            "text_confidence": float (0-1),
            "voice_confidence": float (0-1),
            "debug": {
                "text_score": float,
                "voice_score": float,
                "text_weight": float,
                "voice_weight": float
            }
        }
    """
    try:
        # ------------------------
        # TEXT CONTRIBUTION
        # ------------------------
        text_score = min(max(float(text_risk_score), 0.0), 100.0)
        
        # ------------------------
        # VOICE CONTRIBUTION
        # ------------------------
        voice_score = _compute_voice_risk_score(voice_features)
        
        # ------------------------
        # CONFIDENCE SCORING
        # ------------------------
        text_confidence = _compute_text_confidence(text_risk_score, voice_features)
        voice_confidence = _compute_voice_confidence(voice_features)
        
        # ------------------------
        # ADAPTIVE FUSION WEIGHTS
        # ------------------------
        # Higher confidence → higher weight
        # Normalize so weights sum to 1.0
        total_confidence = text_confidence + voice_confidence
        
        if total_confidence > 0:
            text_weight = text_confidence / total_confidence
            voice_weight = voice_confidence / total_confidence
        else:
            # Fallback to default 60/40 if no confidence
            text_weight = 0.6
            voice_weight = 0.4
        
        # Ensure minimum weight of 0.3 for each modality (prevent complete dismissal)
        text_weight = max(0.3, min(0.7, text_weight))
        voice_weight = 1.0 - text_weight
        
        # ------------------------
        # MULTIMODAL FUSION
        # ------------------------
        final_score = (text_score * text_weight) + (voice_score * voice_weight)
        
        # Cap between 0-100
        final_score = min(max(final_score, 0.0), 100.0)
        
        # Round to integer
        final_score = round(final_score)
        
        # Determine alert threshold
        alert_triggered = final_score >= 70
        
        return {
            "risk_score": final_score,
            "alert_triggered": alert_triggered,
            "text_confidence": round(text_confidence, 3),
            "voice_confidence": round(voice_confidence, 3),
            "debug": {
                "text_score": round(text_score, 2),
                "voice_score": round(voice_score, 2),
                "text_weight": round(text_weight, 3),
                "voice_weight": round(voice_weight, 3)
            }
        }
        
    except Exception as e:
        print(f"Multimodal inference error: {e}")
        # Fallback to text-only score
        return {
            "risk_score": round(min(max(text_risk_score, 0.0), 100.0)),
            "alert_triggered": text_risk_score >= 70,
            "text_confidence": 0.5,
            "voice_confidence": 0.0,
            "debug": {
                "text_score": round(text_risk_score, 2),
                "voice_score": 0.0,
                "text_weight": 1.0,
                "voice_weight": 0.0
            }
        }


def _compute_voice_risk_score(voice_features: Dict[str, float]) -> float:
    """
    Convert voice features into a 0-100 risk score.
    
    Voice feature risk indicators:
    - Pitch: Very high (>300 Hz) or very low (<100 Hz) → stress/fear
    - Energy: High energy (>0.5) → panic/urgency
    - Speech rate: Very fast (>4 wps) or very slow (<1 wps) → stress
    - Pause ratio: High pauses (>0.4) → fear/hesitation
    
    Args:
        voice_features: Dict with pitch, energy, speech_rate, pause_ratio
        
    Returns:
        float: Voice-based risk score (0-100)
    """
    try:
        if not voice_features:
            return 0.0
        
        pitch = float(voice_features.get("pitch", 0.0))
        energy = float(voice_features.get("energy", 0.0))
        speech_rate = float(voice_features.get("speech_rate", 0.0))
        pause_ratio = float(voice_features.get("pause_ratio", 0.0))
        
        voice_risk = 0.0
        
        # ------------------------
        # PITCH ANALYSIS (max 35 points)
        # ------------------------
        # Normal pitch range: ~120-250 Hz for adults
        # Very high (>300) or very low (<100) indicates stress
        if pitch > 0:
            if pitch > 300 or pitch < 100:
                # Extreme pitch → high stress
                voice_risk += 35
            elif pitch > 250 or pitch < 120:
                # Moderate deviation
                voice_risk += 20
            elif pitch > 220 or pitch < 140:
                # Mild deviation
                voice_risk += 10
        
        # ------------------------
        # ENERGY ANALYSIS (max 25 points)
        # ------------------------
        # High energy indicates panic/urgency
        if energy > 0.6:
            voice_risk += 25
        elif energy > 0.4:
            voice_risk += 15
        elif energy > 0.25:
            voice_risk += 8
        
        # ------------------------
        # SPEECH RATE ANALYSIS (max 20 points)
        # ------------------------
        # Normal speech rate: ~2-3 words per second
        # Very fast (>4) or very slow (<1) indicates stress
        if speech_rate > 0:
            if speech_rate > 4.0 or speech_rate < 1.0:
                # Extreme rate → high stress
                voice_risk += 20
            elif speech_rate > 3.5 or speech_rate < 1.5:
                # Moderate deviation
                voice_risk += 12
            elif speech_rate > 3.0 or speech_rate < 2.0:
                # Mild deviation
                voice_risk += 6
        
        # ------------------------
        # PAUSE RATIO ANALYSIS (max 20 points)
        # ------------------------
        # High pause ratio indicates fear/hesitation
        if pause_ratio > 0.5:
            voice_risk += 20
        elif pause_ratio > 0.4:
            voice_risk += 14
        elif pause_ratio > 0.3:
            voice_risk += 8
        elif pause_ratio > 0.2:
            voice_risk += 4
        
        # Cap at 100
        voice_risk = min(voice_risk, 100.0)
        
        return voice_risk
        
    except Exception as e:
        print(f"Voice risk score calculation error: {e}")
        return 0.0


def _compute_text_confidence(text_risk_score: float, voice_features: Dict[str, float]) -> float:
    """
    Compute confidence score for text-based analysis (0-1).
    
    Factors:
    - Higher risk scores → higher confidence (clear distress signals)
    - Keyword density in transcript
    - Emotional intensity markers
    
    Args:
        text_risk_score: Risk score from text analysis (0-100)
        voice_features: Voice features for context
        
    Returns:
        float: Confidence score (0-1)
    """
    try:
        # Base confidence from risk score
        # Higher risk = more confident (clear signals)
        # Lower risk = less confident (ambiguous)
        if text_risk_score >= 70:
            base_confidence = 0.9
        elif text_risk_score >= 50:
            base_confidence = 0.75
        elif text_risk_score >= 30:
            base_confidence = 0.6
        elif text_risk_score >= 10:
            base_confidence = 0.45
        else:
            base_confidence = 0.3
        
        # Boost confidence if voice features corroborate
        if voice_features and text_risk_score > 30:
            voice_score = _compute_voice_risk_score(voice_features)
            # If both modalities agree, boost confidence
            if (voice_score > 30 and text_risk_score > 30) or (voice_score < 30 and text_risk_score < 30):
                base_confidence = min(base_confidence + 0.1, 1.0)
        
        return min(max(base_confidence, 0.0), 1.0)
        
    except Exception as e:
        print(f"Text confidence calculation error: {e}")
        return 0.5


def _compute_voice_confidence(voice_features: Dict[str, float]) -> float:
    """
    Compute confidence score for voice-based analysis (0-1).
    
    Factors:
    - Deviation strength from normal baseline
    - Feature quality (non-zero values)
    - Consistency across features
    
    Args:
        voice_features: Dict with pitch, energy, speech_rate, pause_ratio
        
    Returns:
        float: Confidence score (0-1)
    """
    try:
        if not voice_features:
            return 0.0
        
        pitch = float(voice_features.get("pitch", 0.0))
        energy = float(voice_features.get("energy", 0.0))
        speech_rate = float(voice_features.get("speech_rate", 0.0))
        pause_ratio = float(voice_features.get("pause_ratio", 0.0))
        
        # Count how many features have valid (non-zero) values
        valid_features = sum(1 for v in [pitch, energy, speech_rate, pause_ratio] if v > 0)
        
        if valid_features == 0:
            return 0.0
        
        # Base confidence from feature availability
        feature_confidence = valid_features / 4.0  # 0.25 to 1.0
        
        # Calculate deviation strength
        deviation_score = 0.0
        
        # Pitch deviation
        if pitch > 0:
            if pitch > 300 or pitch < 100:
                deviation_score += 0.3
            elif pitch > 250 or pitch < 120:
                deviation_score += 0.2
            elif pitch > 220 or pitch < 140:
                deviation_score += 0.1
        
        # Energy deviation
        if energy > 0.6:
            deviation_score += 0.25
        elif energy > 0.4:
            deviation_score += 0.15
        elif energy > 0.25:
            deviation_score += 0.08
        
        # Speech rate deviation
        if speech_rate > 0:
            if speech_rate > 4.0 or speech_rate < 1.0:
                deviation_score += 0.25
            elif speech_rate > 3.5 or speech_rate < 1.5:
                deviation_score += 0.15
            elif speech_rate > 3.0 or speech_rate < 2.0:
                deviation_score += 0.08
        
        # Pause ratio deviation
        if pause_ratio > 0.5:
            deviation_score += 0.2
        elif pause_ratio > 0.4:
            deviation_score += 0.14
        elif pause_ratio > 0.3:
            deviation_score += 0.08
        
        # Combine feature availability and deviation strength
        confidence = (feature_confidence * 0.5) + (min(deviation_score, 1.0) * 0.5)
        
        return min(max(confidence, 0.0), 1.0)
        
    except Exception as e:
        print(f"Voice confidence calculation error: {e}")
        return 0.0
