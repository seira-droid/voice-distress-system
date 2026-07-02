import uuid
import hashlib
import logging
import datetime
from pathlib import Path
from django.conf import settings
from utils.ai_client import AIClient

logger = logging.getLogger(__name__)

# ----------------------------
# SAFE UUID CONVERTER
# ----------------------------
def safe_uuid(val):
    if not val:
        return None
    try:
        return uuid.UUID(str(val))
    except ValueError:
        # Generates a deterministic UUID based on string content to prevent db crashes
        hash_val = hashlib.md5(str(val).encode('utf-8')).hexdigest()
        return uuid.UUID(hash_val)


# ----------------------------
# LOAD SYSTEM PROMPT
# ----------------------------
def load_system_prompt():
    # Try multiple possible locations for the prompt file
    base = Path(__file__).resolve()
    
    candidates = [
        base.parents[3] / "docs" / "prompts.md",  # original path
        base.parents[2] / "docs" / "prompts.md",
        base.parents[1] / "docs" / "prompts.md",
        Path("/opt/render/project/src/docs/prompts.md"),  # Render deploy path
    ]

    for path in candidates:
        if path.exists():
            return path.read_text(encoding="utf-8")

    # Fallback so the server doesn't crash if file is missing
    return (
        "You are a distress detection AI. "
        "Analyze the voice event and return a JSON response with fields: "
        "classification, confidence_score, risk_score, category, summary, "
        "recommendations, send_alert."
    )

# ----------------------------
# BUILD AI REQUEST
# ----------------------------
def build_ai_request(
    trigger_phrase_detected,
    transcript,
    intensity_score,
    base_risk_score
):
    system_prompt = load_system_prompt()

    return {
        "system_prompt": system_prompt,
        "user_input": {
            "trigger_phrase_detected": trigger_phrase_detected,
            "transcript": transcript,
            "intensity_score": intensity_score,
            "base_risk_score": base_risk_score
        },
        "output_format": {
            "type": "json",
            "strict": True
        }
    }


# ----------------------------
# FALLBACK SYSTEM
# ----------------------------
def fallback_classifier(transcript, intensity_score, base_risk_score):
    text = transcript.lower() if transcript else ""

    keywords = [
        "help", "following", "weapon", "kill",
        "kidnap", "attack", "danger", "emergency", "police"
    ]

    if any(k in text for k in keywords):
        classification = "Emergency"
        send_alert = True
        risk_score = min(100, int(base_risk_score + intensity_score / 2))
    else:
        classification = "False Positive"
        send_alert = False
        risk_score = max(0, int(base_risk_score / 2))

    return {
        "classification": classification,
        "risk_score": risk_score,
        "category": "Fallback System",
        "summary": "Rule-based fallback activated",
        "recommendations": [
            "Monitor situation",
            "Verify manually if needed"
        ],
        "send_alert": send_alert
    }


# ----------------------------
# PARSER / VALIDATOR
# ----------------------------
def parse_ai_response(ai_response):
    required_fields = {
        "classification": str,
        "confidence_score": (int, float),
        "risk_score": (int, float),
        "category": str,
        "summary": str,
        "recommendations": list,
        "send_alert": bool
    }

    for field, expected_type in required_fields.items():
        if field not in ai_response:
            raise ValueError(f"Missing field: {field}")

        if not isinstance(ai_response[field], expected_type):
            raise TypeError(f"Invalid type: {field}")

    if not (0 <= ai_response["confidence_score"] <= 100):
        raise ValueError("confidence_score must be 0–100")

    if not (0 <= ai_response["risk_score"] <= 100):
        raise ValueError("risk_score must be 0–100")

    return {
        "classification": ai_response["classification"],
        "confidence_score": int(ai_response["confidence_score"]),
        "risk_score": int(ai_response["risk_score"]),
        "category": ai_response["category"],
        "summary": ai_response["summary"],
        "recommendations": ai_response["recommendations"],
        "send_alert": bool(ai_response["send_alert"])
    }


# ----------------------------
# ALERT DECISION ENGINE
# ----------------------------
def should_trigger_alert(result):
    if result["risk_score"] >= 90:
        return True

    if result["classification"] == "Emergency" and result["risk_score"] >= 80:
        return True

    return False


# ----------------------------
# SUPABASE STORAGE
# ----------------------------
def store_voice_event(supabase, input_data, output_data):
    record = {
        "user_id": input_data.get("user_id", "anonymous"),
        "trigger_phrase_detected": input_data.get("trigger_phrase_detected"),
        "transcript": input_data.get("transcript"),
        "intensity_score": input_data.get("intensity_score"),
        "base_risk_score": input_data.get("base_risk_score"),

        "classification": output_data["classification"],
        "confidence_score": output_data["confidence_score"],
        "risk_score": output_data["risk_score"],
        "category": output_data["category"],
        "summary": output_data["summary"],
        "recommendations": output_data["recommendations"],
        "send_alert": output_data["send_alert"]
    }

    logger.info(f"\n[SUPABASE INSERT PAYLOAD]: {record}")
    response = supabase.table("voice_analysis_logs").insert(record).execute()
    logger.info(f"\n[SUPABASE RESPONSE]: {response}")
    return response


# ----------------------------
# TELEGRAM NOTIFICATION DISPATCHER
# ----------------------------
def send_telegram_alerts(
    user_id,
    risk_score,
    confidence_score,
    classification,
    summary,
    transcript,
    latitude,
    longitude,
    voice_event
):
    from ..models import AlertLog
    from utils.telegram_client import TelegramClient

    target_chat = getattr(settings, "TELEGRAM_CHAT_ID", None)
    if not target_chat:
        logger.error("TELEGRAM_CHAT_ID is not configured. Telegram alert skipped.")
        return False

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    location_text = "Not provided"
    maps_link = "Not provided"

    if latitude is not None and longitude is not None:
        location_text = f"Lat: {latitude}, Lng: {longitude}"
        maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"

    message = (
        f"🚨 *EMERGENCY DETECTED* 🚨\n\n"
        f"*Risk Score:* {risk_score}%\n"
        f"*Status:* {classification}\n"
        f"*Transcript:* _{transcript or 'N/A'}_\n"
        f"*Summary:* {summary or 'No summary available.'}\n"
        f"*Time:* {timestamp}\n"
        f"*Location:* {location_text}\n"
        f"*Maps Link:* {maps_link}\n"
    )

    client = TelegramClient()
    success = client.send_message(chat_id=target_chat, text=message)

    if success and voice_event:
        AlertLog.objects.create(
            user_id=safe_uuid(user_id),
            voice_event=voice_event,
            contact=None,
            message_sent=message
        )

    return success


# ----------------------------
# MAIN PIPELINE
# ----------------------------
def analyze_voice_event(
    trigger_phrase_detected,
    transcript,
    intensity_score,
    base_risk_score,
    supabase=None,
    user_id=None,
    audio_file=None,
    latitude=None,
    longitude=None
):
    payload = build_ai_request(
        trigger_phrase_detected,
        transcript,
        intensity_score,
        base_risk_score
    )

    input_data = {
        "trigger_phrase_detected": trigger_phrase_detected,
        "transcript": transcript,
        "intensity_score": intensity_score,
        "base_risk_score": base_risk_score,
        "user_id": user_id
    }

    try:
        client = AIClient()
        ai_output = client.analyze_event(payload)
        parsed_response = parse_ai_response(ai_output)
    except Exception as e:
        logger.error(f"\n❌ AI PIPELINE ERROR: {e}")
        # Run local fallback classifier if the LLM provider fails (extremely important for high reliability)
        parsed_response = fallback_classifier(transcript, intensity_score, base_risk_score)
        parsed_response["confidence_score"] = 50  # Default fallback confidence

    alert_triggered = should_trigger_alert(parsed_response)

    # Save to local database (VoiceEvent, RiskAssessment)
    db_user_id = safe_uuid(user_id)
    voice_event = None
    try:
        from ..models import VoiceEvent, RiskAssessment
        voice_event = VoiceEvent.objects.create(
            user_id=db_user_id,
            audio_file=audio_file or "anonymous_recording.wav",
            distress_keyword=transcript[:100] if transcript else "None"
        )
        
        RiskAssessment.objects.create(
            user_id=db_user_id,
            voice_event=voice_event,
            risk_score=parsed_response["risk_score"],
            risk_level=parsed_response["classification"],
            ai_explanation=parsed_response["summary"]
        )
    except Exception as db_exc:
        logger.error(f"\n❌ DJANGO DB WRITE ERROR: {db_exc}")

    # Dispatch alerts if triggered
    if alert_triggered and voice_event:
        try:
            send_telegram_alerts(
                user_id=user_id,
                risk_score=parsed_response["risk_score"],
                confidence_score=parsed_response["confidence_score"],
                classification=parsed_response["classification"],
                summary=parsed_response["summary"],
                latitude=latitude,
                longitude=longitude,
                voice_event=voice_event
            )
        except Exception as alert_exc:
            logger.error(f"\n❌ TELEGRAM ALERT DISPATCH ERROR: {alert_exc}")

    # Log to Supabase if client is passed
    if supabase:
        try:
            store_voice_event(supabase, input_data, parsed_response)
        except Exception as e:
            logger.error(f"\n❌ SUPABASE LOGGING ERROR: {e}")

    return {
        "event_id": str(voice_event.id) if voice_event else str(uuid.uuid4()),
        "prompt_loaded": True,
        "payload_ready": True,
        "payload_preview": payload["user_input"],
        "received_input": payload["user_input"],
        "transcription": transcript,
        **parsed_response,
        "alert_triggered": alert_triggered
    }
