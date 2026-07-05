"""
AI Distress Analysis Engine
Multi-layer reasoning system for computing risk scores from transcripts.
"""

# ----------------------------
# LAYER 1: CRITICAL EMERGENCY PHRASES
# These phrases indicate immediate, life-threatening situations
# ----------------------------
CRITICAL_PHRASES = {
    # Kidnapping/captivity - highest priority
    "i have been kidnapped": 75,
    "kidnapped": 70,
    "they kidnapped me": 70,
    
    # Direct danger/threat to life
    "i am in danger": 65,
    "i am not safe": 60,
    "someone is attacking me": 65,
    "someone is trying to hurt me": 60,
    
    # Following/stalking with threat
    "someone is following me": 60,
    
    # Police/crime in progress
    "call the police": 55,
    "police": 50,
    "crime": 45,
}

# ----------------------------
# LAYER 2: HIGH EMERGENCY PHRASES
# These phrases indicate serious distress situations
# ----------------------------
HIGH_EMERGENCY_PHRASES = {
    "save me": 40,
    "please help": 35,
    "help me": 35,
    "i need help": 30,
    "emergency": 30,
    "weapon": 35,
    "gun": 40,
    "knife": 35,
    "attacked": 35,
    "attack": 30,
    "hurt": 25,
    "bleeding": 30,
    "trapped": 30,
    "can't breathe": 35,
    "cant breathe": 35,
}

# ----------------------------
# LAYER 3: DISTRESS KEYWORDS
# General distress indicators
# ----------------------------
DISTRESS_KEYWORDS = {
    "help": 20,
    "save": 15,
    "danger": 15,
    "unsafe": 12,
    "hurting": 12,
    "kill": 25,
    "kidnap": 25,
    "trapped": 15,
    "alone": 10,
    "fire": 15,
    "run": 12,
    "stop": 10,
}

# ----------------------------
# LAYER 4: URGENCY INDICATORS
# Time-sensitive language
# ----------------------------
URGENCY_KEYWORDS = {
    "now": 15,
    "immediately": 20,
    "quickly": 15,
    "fast": 12,
    "hurry": 15,
    "anybody": 10,
}

# ----------------------------
# LAYER 5: EMOTIONAL SIGNALS
# Emotional state indicators
# ----------------------------
EMOTIONAL_KEYWORDS = {
    "panic": 25,
    "crying": 20,
    "anxious": 15,
    "terrified": 25,
    "scared": 30,
    "afraid": 25,
    "shaking": 20,
    "trembling": 20,
    "desperate": 20,
    "horrified": 25,
    "screaming": 20,
    "sobbing": 15,
}

# ----------------------------
# LAYER 6: INTENSITY MARKERS
# Repetition and emphasis indicators
# ----------------------------
INTENSITY_MARKERS = [
    "!!!",
    "help help help",
    "emergency emergency",
]


# ----------------------------
# CONTEXT SCALING
# ----------------------------
def _apply_context_scaling(base_score, transcript):
    """
    Use transcript length as a mild scaling factor.
    Longer distressed statements increase confidence slightly.
    """
    if not transcript:
        return base_score
    
    word_count = len(transcript.split())
    
    # Scale factor: 1.0 at 5 words, up to 1.3 at 50+ words
    if word_count <= 5:
        scale = 1.0
    elif word_count >= 50:
        scale = 1.3
    else:
        # Linear interpolation between 1.0 and 1.3
        scale = 1.0 + ((word_count - 5) / 45) * 0.3
    
    return base_score * scale


# ----------------------------
# MAIN ANALYSIS FUNCTION
# ----------------------------
def analyze_distress(transcript):
    """
    Compute risk_score using 6-layer analysis system.
    
    Args:
        transcript (str): The transcribed text from STT
        
    Returns:
        dict: {
            "risk_score": int (0-100, capped),
            "alert_triggered": bool (true if risk_score >= 70)
        }
    """
    if not transcript:
        return {
            "risk_score": 0,
            "alert_triggered": False
        }
    
    text = transcript.lower()
    
    # ------------------------
    # LAYER 1: Critical Emergency Phrases
    # ------------------------
    layer1_score = 0
    
    for phrase, weight in CRITICAL_PHRASES.items():
        if phrase in text:
            layer1_score += weight
    
    # ------------------------
    # LAYER 2: High Emergency Phrases
    # ------------------------
    layer2_score = 0
    
    for phrase, weight in HIGH_EMERGENCY_PHRASES.items():
        if phrase in text:
            layer2_score += weight
    
    # ------------------------
    # LAYER 3: Distress Keywords
    # ------------------------
    layer3_score = 0
    
    for keyword, weight in DISTRESS_KEYWORDS.items():
        if keyword in text:
            layer3_score += weight
    
    # ------------------------
    # LAYER 4: Urgency Keywords
    # ------------------------
    layer4_score = 0
    
    for keyword, weight in URGENCY_KEYWORDS.items():
        if keyword in text:
            layer4_score += weight
    
    # ------------------------
    # LAYER 5: Emotional Signals
    # ------------------------
    layer5_score = 0
    
    for keyword, weight in EMOTIONAL_KEYWORDS.items():
        if keyword in text:
            layer5_score += weight
    
    # Check intensity markers (repeated exclamations, repetitions)
    for marker in INTENSITY_MARKERS:
        if marker in text:
            layer5_score += 10
    
    # Count exclamation marks
    exclamation_count = text.count("!")
    if exclamation_count >= 3:
        layer5_score += 15
    elif exclamation_count >= 1:
        layer5_score += 8
    
    # ------------------------
    # LAYER 6: Context Scaling
    # ------------------------
    combined_score = layer1_score + layer2_score + layer3_score + layer4_score + layer5_score
    scaled_score = _apply_context_scaling(combined_score, transcript)
    
    # ------------------------
    # Final Calculation
    # ------------------------
    # Convert to 0-100 scale and cap
    risk_score = min(int(scaled_score), 100)
    
    # Ensure minimum of 0
    risk_score = max(risk_score, 0)
    
    # Determine if alert should be triggered (threshold: 70)
    alert_triggered = risk_score >= 70
    
    return {
        "risk_score": risk_score,
        "alert_triggered": alert_triggered
    }


# ----------------------------
# LEGACY FUNCTIONS (kept for backward compatibility)
# ----------------------------
def calculate_base_risk(transcript, intensity_score=0.5):
    """
    Legacy function - delegates to new analyze_distress.
    Returns a float between 0.0 and 1.0 for compatibility.
    """
    result = analyze_distress(transcript)
    return result["risk_score"] / 100.0


def get_risk_level(risk_score):
    if risk_score >= 81:
        return "CRITICAL"
    elif risk_score >= 61:
        return "HIGH"
    elif risk_score >= 31:
        return "MEDIUM"
    else:
        return "LOW"


def should_send_alert(risk_score, threshold=80):
    return risk_score > threshold