import pytest

from distress_app.services.ai_service import parse_ai_response

# existing test 1 ...

# existing test 2 ...

from distress_app.services.ai_service import should_trigger_alert


def test_should_trigger_alert_high_risk():
    result = {
        "classification": "Emergency",
        "risk_score": 95,
    }

    assert should_trigger_alert(result) is True