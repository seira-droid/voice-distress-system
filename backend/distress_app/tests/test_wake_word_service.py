from distress_app.services.wake_word_service import detect_wake_word


def test_detects_wake_word_with_hyphenated_punctuation():
    assert detect_wake_word("Hey-guardian, please help me", "hey guardian") is True


def test_detects_wake_word_in_longer_phrase():
    assert detect_wake_word("Can you hear me, hey guardian?", "hey guardian") is True


def test_returns_false_when_wake_word_is_not_present():
    assert detect_wake_word("I need assistance with my laptop", "hey guardian") is False
