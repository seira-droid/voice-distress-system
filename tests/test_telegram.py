import pytest
import unittest.mock as mock
from django.conf import settings
from backend.utils.telegram_client import TelegramClient
from backend.distress_app.services.ai_service import analyze_voice_event, safe_uuid
from backend.distress_app.models import EmergencyContact, VoiceEvent, RiskAssessment, AlertLog

@pytest.fixture
def mock_httpx_post():
    with mock.patch("httpx.post") as mock_post:
        yield mock_post

@pytest.fixture
def mock_ai_client():
    with mock.patch("backend.distress_app.services.ai_service.AIClient") as mock_client:
        # Mock the instance's analyze_event method
        instance = mock_client.return_value
        instance.analyze_event.return_value = {
            "classification": "Emergency",
            "confidence_score": 95,
            "risk_score": 92,
            "category": "Voice Distress",
            "summary": "High stress voice distress identified.",
            "recommendations": ["Contact emergency services", "Stay safe"],
            "send_alert": True
        }
        yield instance

@pytest.mark.django_db
def test_telegram_client_simulated_when_no_token():
    """Test that TelegramClient fallback is simulated when bot token is empty/None."""
    with mock.patch.object(settings, "TELEGRAM_BOT_TOKEN", None), \
         mock.patch.object(settings, "TELEGRAM_CHAT_ID", "12345"):
        
        client = TelegramClient()
        # Should return True because it simulates
        success = client.send_message(chat_id="12345", text="Test message")
        assert success is True

@pytest.mark.django_db
def test_telegram_client_send_success(mock_httpx_post):
    """Test successful message sending via Telegram bot API."""
    mock_response = mock.Mock()
    mock_response.status_code = 200
    mock_httpx_post.return_value = mock_response

    with mock.patch.object(settings, "TELEGRAM_BOT_TOKEN", "mock-token"):
        client = TelegramClient()
        success = client.send_message(chat_id="123456", text="Emergency!", retries=1)
        assert success is True
        mock_httpx_post.assert_called_once()
        # Verify call arguments
        call_args = mock_httpx_post.call_args
        assert call_args[0][0] == "https://api.telegram.org/botmock-token/sendMessage"
        assert call_args[1]["json"]["chat_id"] == "123456"
        assert call_args[1]["json"]["text"] == "Emergency!"

@pytest.mark.django_db
def test_telegram_client_retry_and_fail(mock_httpx_post):
    """Test that TelegramClient retries on network/HTTP errors and eventually returns False."""
    mock_response = mock.Mock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_httpx_post.return_value = mock_response

    with mock.patch.object(settings, "TELEGRAM_BOT_TOKEN", "mock-token"), \
         mock.patch("time.sleep") as mock_sleep:  # Mock sleep to run fast
        
        client = TelegramClient()
        success = client.send_message(chat_id="123456", text="Emergency!", retries=3)
        assert success is False
        assert mock_httpx_post.call_count == 3
        assert mock_sleep.call_count == 2

@pytest.mark.django_db
def test_voice_distress_pipeline_triggers_alerts(mock_ai_client, mock_httpx_post):
    """Test the complete Voice -> AI -> Telegram Alert pipeline."""
    # Mock successful HTTP request to Telegram Bot API
    mock_response = mock.Mock()
    mock_response.status_code = 200
    mock_httpx_post.return_value = mock_response

    user_id = "test-user-uuid"
    db_user_id = safe_uuid(user_id)

    # Register an emergency contact
    contact = EmergencyContact.objects.create(
        user_id=db_user_id,
        name="Alice Cooper",
        phone_number="+1234567890",
        relationship="guardian",
        telegram_chat_id="99887766"
    )

    with mock.patch.object(settings, "TELEGRAM_BOT_TOKEN", "mock-token"):
        result = analyze_voice_event(
            trigger_phrase_detected=True,
            transcript="Help me please, someone is following me",
            intensity_score=85,
            base_risk_score=80,
            user_id=user_id,
            latitude=37.7749,
            longitude=-122.4194
        )

        # Check returned result structures
        assert result["alert_triggered"] is True
        assert result["classification"] == "Emergency"
        assert result["risk_score"] == 92

        # Verify VoiceEvent, RiskAssessment, and AlertLog models are created in DB
        assert VoiceEvent.objects.filter(user_id=db_user_id).exists()
        voice_event = VoiceEvent.objects.filter(user_id=db_user_id).first()
        assert voice_event is not None

        assert RiskAssessment.objects.filter(voice_event=voice_event).exists()
        assessment = RiskAssessment.objects.filter(voice_event=voice_event).first()
        assert assessment.risk_score == 92
        assert assessment.risk_level == "Emergency"

        # Verify AlertLog records the Telegram alert sending
        assert AlertLog.objects.filter(voice_event=voice_event, contact=contact).exists()
        alert_log = AlertLog.objects.filter(voice_event=voice_event, contact=contact).first()
        assert alert_log.contact.name == "Alice Cooper"
        assert "Lat: 37.7749, Lng: -122.4194" in alert_log.message_sent
        assert "https://www.google.com/maps?q=37.7749,-122.4194" in alert_log.message_sent

        # Check Telegram API call was made
        mock_httpx_post.assert_called_once()
        post_json = mock_httpx_post.call_args[1]["json"]
        assert post_json["chat_id"] == "99887766"
        assert "User (test-user-uuid)" in post_json["text"]
        assert "*Risk Score:* 92%" in post_json["text"]
