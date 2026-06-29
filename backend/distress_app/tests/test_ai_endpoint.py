import pytest
from unittest.mock import patch
from rest_framework.test import APIClient


@pytest.mark.django_db
@patch("distress_app.services.ai_service.AIClient")
def test_analyze_voice_success(mock_ai_client):
    mock_ai_client.return_value.analyze_event.return_value = {
        "classification": "Emergency",
        "confidence_score": 95,
        "risk_score": 92,
        "category": "Threat",
        "summary": "High risk situation",
        "recommendations": ["Call emergency services"],
        "send_alert": True,
    }

    client = APIClient()

    payload = {
        "trigger_phrase_detected": True,
        "transcript": "Help me please",
        "intensity_score": 90,
        "base_risk_score": 80,
    }

    response = client.post(
        "/api/v1/voice/analyze/",
        payload,
        format="json",
    )

    assert response.status_code == 200

    data = response.json()

    assert data["classification"] == "Emergency"
    assert data["risk_score"] == 92
    assert data["send_alert"] is True
    assert data["alert_triggered"] is True