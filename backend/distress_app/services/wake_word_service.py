def detect_wake_word(transcript, trigger_word):
    """
    Check if the transcript contains the configured wake word.
    Returns True if detected, False otherwise.
    """
    if not transcript or not trigger_word:
        return False

    transcript_lower = transcript.strip().lower()
    trigger_lower = trigger_word.strip().lower()

    # Direct match
    if trigger_lower in transcript_lower:
        return True

    # Fuzzy match — handles slight mishearing
    trigger_words = trigger_lower.split()
    transcript_words = transcript_lower.split()

    matches = sum(1 for w in trigger_words if w in transcript_words)
    match_ratio = matches / len(trigger_words) if trigger_words else 0

    return match_ratio >= 0.75