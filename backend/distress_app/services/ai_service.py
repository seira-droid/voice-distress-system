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
    # Convert float scores to integers for Supabase integer columns
    intensity_score = input_data.get("intensity_score", 0)
    base_risk_score = input_data.get("base_risk_score", 0)
    
    record = {
        "user_id": input_data.get("user_id", "anonymous"),
        "trigger_phrase_detected": input_data.get("trigger_phrase_detected"),
        "transcript": input_data.get("transcript"),
        "intensity_score": int(round(float(intensity_score) * 100)) if intensity_score else 0,
        "base_risk_score": int(round(float(base_risk_score) * 100)) if base_risk_score else 0,

        "classification": output_data["classification"],
        "confidence_score": int(output_data["confidence_score"]),
        "risk_score": int(output_data["risk_score"]),
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
    from ..models import AlertLog, EmergencyContact, Incident
    from utils.telegram_client import TelegramClient

    # Check if Telegram is configured
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not bot_token:
        logger.error("TELEGRAM_BOT_TOKEN is not configured. Telegram alert skipped.")
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
        f"*Maps Link:* {maps_link}\n\n"
        f"⚠️ Please contact the user immediately."
    )

    # Get all emergency contacts for this user
    contacts = []
    try:
        db_user_id = safe_uuid(user_id)
        contacts = EmergencyContact.objects.filter(user_id=db_user_id)
    except Exception as e:
        logger.error(f"Failed to fetch emergency contacts: {e}")
        return False

    if not contacts.exists():
        logger.warning("No emergency contacts found. Telegram alert skipped.")
        return False

    total_count = contacts.count()

    print(f"\n🚨 ALERT TRIGGERED")
    print(f"   Risk Score: {risk_score}%")
    print(f"   Classification: {classification}")
    print(f"   Sending to {total_count} emergency contacts...")

    # STEP 1: Create the Incident record BEFORE sending notifications
    incident = None
    try:
        incident = Incident.objects.create(
            user_id=safe_uuid(user_id),
            transcript=transcript or "",
            risk_score=risk_score,
            classification=classification,
            confidence_score=confidence_score,
            alert_message=message,
            alert_triggered=True,
            telegram_delivery_status=False,
            contacts_notified=total_count,
            contacts_successful=0,
            contacts_failed=0,
            incident_status=Incident.Status.OPEN,
            voice_event=voice_event
        )
        print(f"\n   📋 Incident #{incident.id} created (Open)")
        print(f"      Risk Score: {risk_score}, Classification: {classification}")
    except Exception as incident_create_exc:
        logger.error(f"Failed to create Incident record: {incident_create_exc}")
        print(f"   ⚠️ Incident creation failed: {incident_create_exc}")

    # STEP 2: Send alerts to all contacts and log results
    client = TelegramClient()
    success_count = 0
    failure_count = 0

    # Debug: Check if fallback_chat_id is loaded
    print(f"   🔧 TelegramClient fallback_chat_id: '{client.fallback_chat_id}'")
    print(f"   🔧 Settings TELEGRAM_CHAT_ID: '{getattr(settings, 'TELEGRAM_CHAT_ID', None)}'")

    for contact in contacts:
        # Use contact's telegram_chat_id, or fall back to global TELEGRAM_CHAT_ID
        chat_id = contact.telegram_chat_id or client.fallback_chat_id
        
        # Debug logging
        print(f"   📋 Contact: {contact.id} | {contact.name} | telegram_chat_id: '{contact.telegram_chat_id}' | fallback: '{client.fallback_chat_id}' | using: '{chat_id}'")
        
        if not chat_id:
            print(f"   ⚠️ Contact {contact.name} has no Telegram chat ID, skipping...")
            continue

        delivery_error = ""
        delivered = False
        try:
            print(f"   📤 Sending Telegram message to {contact.name} (chat_id: {chat_id})...")
            result = client.send_message_with_details(chat_id=chat_id, text=message)
            
            if result.get("success"):
                print(f"   ✅ Telegram message sent successfully to {contact.name}")
                success_count += 1
                delivered = True
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"   ❌ Telegram delivery failed to {contact.name}: {error_msg}")
                delivery_error = error_msg
                failure_count += 1
                
        except Exception as e:
            delivery_error = str(e)
            print(f"   ❌ Telegram delivery failed to {contact.name}: {e}")
            logger.error(f"Telegram alert failed for {contact.name}: {e}")
            failure_count += 1

        # Log delivery result to AlertLog (linked to Incident if available)
        if voice_event:
            try:
                AlertLog.objects.create(
                    user_id=safe_uuid(user_id),
                    voice_event=voice_event,
                    contact=contact,
                    message_sent=message,
                    delivered=delivered,
                    delivery_error=delivery_error,
                    incident=incident
                )
            except Exception as log_exc:
                logger.error(f"Failed to create AlertLog: {log_exc}")

    # STEP 3: Update the Incident with delivery results
    if incident:
        try:
            incident.telegram_delivery_status = success_count > 0
            incident.contacts_successful = success_count
            incident.contacts_failed = failure_count
            incident.save(update_fields=[
                "telegram_delivery_status", "contacts_successful",
                "contacts_failed", "incident_status"
            ])
            print(f"\n   📋 Incident #{incident.id} updated with delivery results")
            print(f"      Telegram: {'✅ SUCCESS' if incident.telegram_delivery_status else '❌ FAILED'}")
            print(f"      {success_count}/{total_count} delivered, {failure_count} failed")
        except Exception as incident_update_exc:
            logger.error(f"Failed to update Incident record: {incident_update_exc}")

    print(f"   📊 Alert Summary: {success_count}/{total_count} messages delivered successfully")
    
    return success_count > 0


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
            transcript=transcript or "",
            trigger_phrase_detected=trigger_phrase_detected,
            intensity_score=intensity_score,
            base_risk_score=base_risk_score,
            classification=parsed_response["classification"],
            risk_score=parsed_response["risk_score"],
            confidence_score=parsed_response["confidence_score"],
            category=parsed_response["category"],
            summary=parsed_response["summary"],
            recommendations=parsed_response["recommendations"],
            send_alert=parsed_response["send_alert"],
            alert_triggered=alert_triggered
        )
        
        RiskAssessment.objects.create(
            voice_event=voice_event,
            risk_score=parsed_response["risk_score"],
            risk_level=parsed_response["classification"],
            ai_explanation=parsed_response["summary"]
        )
    except Exception as db_exc:
        logger.error(f"\n❌ DJANGO DB WRITE ERROR: {db_exc}")

    # Dispatch alerts if triggered and track actual delivery status
    telegram_delivered = False
    if alert_triggered and voice_event:
        try:
            telegram_delivered = send_telegram_alerts(
                user_id=user_id,
                risk_score=parsed_response["risk_score"],
                confidence_score=parsed_response["confidence_score"],
                classification=parsed_response["classification"],
                summary=parsed_response["summary"],
                transcript=transcript,
                latitude=latitude,
                longitude=longitude,
                voice_event=voice_event
            )
        except Exception as alert_exc:
            logger.error(f"\n❌ TELEGRAM ALERT DISPATCH ERROR: {alert_exc}")
            telegram_delivered = False

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
        "alert_triggered": alert_triggered,
        "telegram_delivered": telegram_delivered
    }
