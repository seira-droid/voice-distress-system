"""
AI Distress Analysis Engine
Multi-layer reasoning system for computing risk scores from transcripts.
"""

# ----------------------------
# LAYER 1: SEMANTIC KEYWORDS
# ----------------------------
DISTRESS_KEYWORDS = {
    "help": 10,
    "save me": 15,
    "emergency": 15,
    "danger": 12,
    "unsafe": 10,
    "hurt": 10,
    "scared": 8,
    "afraid": 8,
    "following me": 12,
    "someone following me": 15,
    "hurting": 10,
    "attack": 12,
    "kill": 15,
    "weapon": 15,
    "kidnap": 15,
    "trapped": 12,
    "alone": 6,
    "bleeding": 12,
    "fire": 10,
    "run": 8,
    "stop": 6,
    "no": 5,
    "please": 5,
}

URGENCY_KEYWORDS = {
    "now": 8,
    "immediately": 10,
    "quickly": 8,
    "fast": 6,
    "hurry": 8,
    "someone": 5,
    "anybody": 5,
    "can't breathe": 12,
    "cant breathe": 12,
}

# ----------------------------
# LAYER 2: EMOTIONAL SIGNALS
# ----------------------------
EMOTIONAL_KEYWORDS = {
    "panic": 10,
    "crying": 8,
    "anxious": 7,
    "terrified": 12,
    "shaking": 8,
    "trembling": 8,
    "desperate": 10,
    "horrified": 12,
    "screaming": 10,
    "sobbing": 8,
}

INTENSITY_MARKERS = [
    "!!!",
    "!!!",
    "help help help",
    "emergency emergency",
]


# ----------------------------
# LAYER 3: CONTEXT SCALING
# ----------------------------
def _apply_context_scaling(base_score, transcript):
    """
    Use transcript length as a mild scaling factor.
    Longer distressed statements increase confidence slightly.
    """
    if not transcript:
        return base_score
    
    word_count = len(transcript.split())
    
    # Scale factor: 1.0 at 5 words, up to 1.2 at 50+ words
    if word_count <= 5:
        scale = 1.0
    elif word_count >= 50:
        scale = 1.2
    else:
        # Linear interpolation between 1.0 and 1.2
        scale = 1.0 + ((word_count - 5) / 45) * 0.2
    
    return base_score * scale


# ----------------------------
# MAIN ANALYSIS FUNCTION
# ----------------------------
def analyze_distress(transcript):
    """
    Compute risk_score using 3-layer analysis system.
    
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
    words = text.split()
    
    # ------------------------
    # LAYER 1: Semantic Keywords
    # ------------------------
    layer1_score = 0
    
    # Check distress keywords
    for keyword, weight in DISTRESS_KEYWORDS.items():
        if keyword in text:
            layer1_score += weight
    
    # Check urgency keywords
    for keyword, weight in URGENCY_KEYWORDS.items():
        if keyword in text:
            layer1_score += weight
    
    # Cap layer 1 at 50 points
    layer1_score = min(layer1_score, 50)
    
    # ------------------------
    # LAYER 2: Emotional Signals
    # ------------------------
    layer2_score = 0
    
    # Check emotional keywords
    for keyword, weight in EMOTIONAL_KEYWORDS.items():
        if keyword in text:
            layer2_score += weight
    
    # Check intensity markers (repeated exclamations, repetitions)
    for marker in INTENSITY_MARKERS:
        if marker in text:
            layer2_score += 8
    
    # Count exclamation marks
    exclamation_count = text.count("!")
    if exclamation_count >= 3:
        layer2_score += 10
    elif exclamation_count >= 1:
        layer2_score += 5
    
    # Cap layer 2 at 30 points
    layer2_score = min(layer2_score, 30)
    
    # ------------------------
    # LAYER 3: Context Scaling
    # ------------------------
    combined_score = layer1_score + layer2_score
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