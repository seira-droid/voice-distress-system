import os

def test_anthropic_api_key_present():
    assert os.getenv("ANTHROPIC_API_KEY") is not None