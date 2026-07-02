import re


def _normalize_phrase(value):
    if not value:
        return ""

    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


def detect_wake_word(transcript, trigger_word):
    """
    Check if the transcript contains the configured wake word.
    Returns True if detected, False otherwise.
    """
    normalized_transcript = _normalize_phrase(transcript)
    normalized_trigger = _normalize_phrase(trigger_word)

    if not normalized_transcript or not normalized_trigger:
        return False

    if normalized_trigger in normalized_transcript:
        return True

    trigger_words = normalized_trigger.split()
    transcript_words = normalized_transcript.split()

    if not trigger_words:
        return False

    matches = sum(1 for word in trigger_words if word in transcript_words)
    match_ratio = matches / len(trigger_words)

    return match_ratio >= 0.75