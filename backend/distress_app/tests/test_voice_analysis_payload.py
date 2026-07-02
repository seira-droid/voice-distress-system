from rest_framework.test import APIRequestFactory

from distress_app.views import coerce_voice_analysis_payload


def test_coerce_voice_analysis_payload_accepts_form_data():
    factory = APIRequestFactory()
    request = factory.post(
        "/api/v1/voice/analyze/",
        {
            "transcript": "I need help",
            "intensity_score": "0.8",
            "base_risk_score": "0.5",
        },
        format="multipart",
    )

    payload = coerce_voice_analysis_payload(request)

    assert payload["transcript"] == "I need help"
    assert payload["intensity_score"] == 0.8
    assert payload["base_risk_score"] == 0.5
    assert payload["trigger_phrase_detected"] is False


def test_coerce_voice_analysis_payload_normalizes_percentage_scores():
    factory = APIRequestFactory()
    request = factory.post(
        "/api/v1/voice/analyze/",
        {
            "transcript": "I need help",
            "intensity_score": "80",
            "base_risk_score": "50",
        },
        format="multipart",
    )

    payload = coerce_voice_analysis_payload(request)

    assert payload["transcript"] == "I need help"
    assert payload["intensity_score"] == 0.8
    assert payload["base_risk_score"] == 0.5
    assert payload["trigger_phrase_detected"] is False
