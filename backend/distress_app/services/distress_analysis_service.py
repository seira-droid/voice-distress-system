DISTRESS_KEYWORDS = [
    "help", "save", "emergency", "danger", "scared",
    "afraid", "following", "hurting", "attack", "kill",
    "weapon", "kidnap", "hurt", "please", "stop", "no",
    "trapped", "alone", "bleeding", "fire", "run",
]

URGENCY_KEYWORDS = [
    "now", "immediately", "quick", "fast", "hurry",
    "please", "someone", "anybody",
]

EMOTIONAL_KEYWORDS = [
    "scared", "terrified", "afraid", "panic", "crying",
    "shaking", "trembling", "desperate", "horrified",
]


def calculate_base_risk(transcript, intensity_score=0.5):
    """
    Rule-based risk scorer using keyword analysis.
    Returns a float between 0.0 and 1.0.
    """
    if not transcript:
        return 0.0

    text = transcript.lower()
    words = text.split()

    distress_hits = sum(1 for k in DISTRESS_KEYWORDS if k in text)
    urgency_hits = sum(1 for k in URGENCY_KEYWORDS if k in text)
    emotional_hits = sum(1 for k in EMOTIONAL_KEYWORDS if k in text)

    # Weighted score
    keyword_score = (
        (distress_hits * 0.5) +
        (urgency_hits * 0.3) +
        (emotional_hits * 0.2)
    )

    # Normalize to 0–1 (cap at 1.0)
    normalized = min(keyword_score / 5.0, 1.0)

    # Blend with intensity
    blended = (normalized * 0.6) + (intensity_score * 0.4)

    return round(min(blended, 1.0), 3)


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