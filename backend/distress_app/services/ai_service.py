import uuid
from pathlib import Path
from utils.ai_client import AIClient

# ----------------------------
# LOAD SYSTEM PROMPT
# ----------------------------
def load_system_prompt():
    project_root = Path(__file__).resolve().parents[3]
    prompt_file = project_root / "docs" / "prompts.md"

    with open(prompt_file, "r", encoding="utf-8") as file:
        return file.read()


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

    text = transcript.lower()

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

    response = supabase.table("voice_analysis_logs").insert(record).execute()
    return response


# ----------------------------
# MAIN PIPELINE
# ----------------------------
def analyze_voice_event(
    trigger_phrase_detected,
    transcript,
    intensity_score,
    base_risk_score,
    supabase=None,
    user_id=None
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
        print("AI pipeline failed")
        raise e

    alert_triggered = should_trigger_alert(parsed_response)

    if supabase:
        try:
            store_voice_event(supabase, input_data, parsed_response)
        except Exception:
            print("Supabase storage failed")

    return {
        "event_id": str(uuid.uuid4()),
        "prompt_loaded": True,
        "payload_ready": True,
        "payload_preview": payload["user_input"],
        "received_input": payload["user_input"],
        **parsed_response,
        "alert_triggered": alert_triggered
    }