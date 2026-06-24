from utils.supabase_client import upload_file, get_supabase
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from rest_framework import viewsets, serializers
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle
import os

from .models import EmergencyContact, TriggerWord
from .serializers import (
    EmergencyContactSerializer,
    FileUploadSerializer,
    FileURLSerializer,
)
from .services.ai_service import analyze_voice_event


# -----------------------------
# THROTTLE
# -----------------------------
class BurstThrottle(AnonRateThrottle):
    rate = '10/min'


# -----------------------------
# EMERGENCY CONTACT API
# -----------------------------
@extend_schema(tags=["Emergency Contacts"])
class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all().order_by("id")
    serializer_class = EmergencyContactSerializer
    permission_classes = [AllowAny]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name", "relationship"]


# -----------------------------
# TRIGGER WORD API
# -----------------------------
class TriggerWordSerializer(serializers.Serializer):
    word = serializers.CharField(required=True)

    def validate_word(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError("Trigger word cannot be empty.")

        if len(value.split()) > 3:
            raise serializers.ValidationError("Trigger word must be 1 to 3 words.")

        return value


@extend_schema(
    request=TriggerWordSerializer,
    responses=TriggerWordSerializer,
    tags=["Trigger Word"],
)
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
def trigger_word(request):
    user_id = "test-user"

    if request.method == "GET":
        trigger, _ = TriggerWord.objects.get_or_create(
            user_id=user_id,
            defaults={"word": "help"},
        )
        return Response({"word": trigger.word}, status=200)

    serializer = TriggerWordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    word = serializer.validated_data["word"]

    TriggerWord.objects.update_or_create(
        user_id=user_id,
        defaults={"word": word},
    )

    return Response({"word": word}, status=200)


# -----------------------------
# FILE UPLOAD API
# FIX: wrapped upload_file() in try/except to surface Supabase errors
#      instead of crashing into a 500.
# -----------------------------
@extend_schema(
    tags=["File Upload"],
    request=FileUploadSerializer,
    responses=inline_serializer(
        name="FileUploadResponse",
        fields={
            "message": serializers.CharField(),
            "file_name": serializers.CharField(),
            "url": serializers.CharField(),
        },
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def upload_file_view(request):

    serializer = FileUploadSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    file = serializer.validated_data["file"]

    try:
        result = upload_file(file)
    except Exception as e:
        return Response(
            {"error": "File upload failed", "detail": str(e)},
            status=500,
        )

    if not result:
        return Response(
            {"error": "File upload returned no result. Check Supabase configuration."},
            status=500,
        )

    return Response(
        {
            "message": "File uploaded successfully",
            "file_name": result.get("file_name"),
            "url": result.get("url"),
        },
        status=201,
    )


# -----------------------------
# GET FILE URL API
# -----------------------------
@extend_schema(
    tags=["File Upload"],
    parameters=[
        OpenApiParameter(
            name="file_name",
            type=str,
            location=OpenApiParameter.QUERY,
            required=True,
        )
    ],
    responses=FileURLSerializer,
)
@api_view(["GET"])
@permission_classes([AllowAny])
def get_file_url(request):

    file_name = request.query_params.get("file_name")

    if not file_name:
        return Response({"error": "file_name is required"}, status=400)

    supabase = get_supabase()
    bucket = supabase.storage.from_("distress-files")

    url = bucket.get_public_url(file_name)

    return Response(
        {
            "file_name": file_name,
            "url": url,
        },
        status=200,
    )


# -----------------------------
# VOICE ANALYSIS API
# FIX 1: Added VoiceAnalyzeSerializer to validate all required fields
#         before touching request.data — prevents KeyError → 500.
# FIX 2: Wrapped analyze_voice_event() in try/except so AI service
#         errors return a clean 500 JSON, not an HTML crash page.
# -----------------------------
class VoiceAnalyzeSerializer(serializers.Serializer):
    trigger_phrase_detected = serializers.BooleanField(required=True)
    transcript = serializers.CharField(required=True, allow_blank=False)
    intensity_score = serializers.FloatField(required=True, min_value=0.0, max_value=1.0)
    base_risk_score = serializers.FloatField(required=True, min_value=0.0, max_value=1.0)


@extend_schema(
    tags=["Voice Analysis"],
    request=VoiceAnalyzeSerializer,
    responses=inline_serializer(
        name="VoiceAnalyzeResponse",
        fields={
            "risk_level": serializers.CharField(),
            "recommendation": serializers.CharField(),
            "confidence": serializers.FloatField(),
        },
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
def analyze_voice(request):

    throttle = BurstThrottle()
    if not throttle.allow_request(request, None):
        return Response({"detail": "Rate limit exceeded"}, status=429)

    serializer = VoiceAnalyzeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    try:
        result = analyze_voice_event(
            trigger_phrase_detected=data["trigger_phrase_detected"],
            transcript=data["transcript"],
            intensity_score=data["intensity_score"],
            base_risk_score=data["base_risk_score"],
        )
    except Exception as e:
        return Response(
            {"error": "Voice analysis failed", "detail": str(e)},
            status=500,
        )

    return Response(result, status=200)


# -----------------------------
# DIAGNOSTICS API
# -----------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def diagnose_status(request):

    status_info = {}

    env_vars = [
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SECRET_KEY",
        "ANTHROPIC_API_KEY",
        "GROQ_API_KEY",
        "GEMINI_API_KEY",
    ]

    status_info["environment_variables"] = {
        var: (var in os.environ and len(os.environ[var]) > 0)
        for var in env_vars
    }

    try:
        connection.ensure_connection()
        status_info["database_connection"] = "connected"
    except Exception as e:
        status_info["database_connection"] = f"failed: {str(e)}"

    try:
        get_supabase()
        status_info["supabase_initialization"] = "success"
    except Exception as e:
        status_info["supabase_initialization"] = f"failed: {str(e)}"

    return Response(status_info, status=200)
from .services.wake_word_service import detect_wake_word
from .services.speech_to_text_service import transcribe_audio_bytes
from .services.distress_analysis_service import (
    calculate_base_risk, get_risk_level, should_send_alert
)


@extend_schema(tags=["Voice Analysis"])
@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def record_and_analyze(request):
    """
    Full pipeline:
    1. Receive audio file from browser
    2. Transcribe with Whisper
    3. Detect wake word
    4. Calculate distress score
    5. Run AI analysis
    6. Send Telegram alert if threshold exceeded
    7. Return full result
    """
    audio_file = request.FILES.get("audio")
    user_lat = request.data.get("user_latitude")
    user_lon = request.data.get("user_longitude")

    if not audio_file:
        return Response({"error": "No audio file provided"}, status=400)

    # Step 1 — Transcribe
    try:
        audio_bytes = audio_file.read()
        stt_result = transcribe_audio_bytes(audio_bytes, audio_file.name)
        transcript = stt_result.get("transcript", "")
    except Exception as e:
        return Response({"error": "Transcription failed", "detail": str(e)}, status=500)

    # Step 2 — Wake word detection
    trigger_obj = TriggerWord.objects.filter(user_id="test-user").first()
    trigger_word_text = trigger_obj.word if trigger_obj else "help"
    wake_word_detected = detect_wake_word(transcript, trigger_word_text)

    # Step 3 — Base risk score
    intensity_score = float(request.data.get("intensity_score", 0.5))
    base_risk = calculate_base_risk(transcript, intensity_score)

    # Step 4 — AI analysis
    try:
        result = analyze_voice_event(
            trigger_phrase_detected=wake_word_detected,
            transcript=transcript,
            intensity_score=intensity_score,
            base_risk_score=base_risk,
        )
    except Exception as e:
        return Response({"error": "AI analysis failed", "detail": str(e)}, status=500)

    risk_score = result.get("risk_score", 0)
    risk_level = get_risk_level(risk_score)

    # Step 5 — Save event
    event = VoiceEvent.objects.create(
        transcript=transcript,
        trigger_phrase_detected=wake_word_detected,
        intensity_score=intensity_score,
        base_risk_score=base_risk,
        classification=result.get("classification", ""),
        risk_score=risk_score,
        confidence_score=result.get("confidence_score", 0),
        category=result.get("category", ""),
        summary=result.get("summary", ""),
        recommendations=result.get("recommendations", []),
        send_alert=result.get("send_alert", False),
        alert_triggered=result.get("alert_triggered", False),
        user_latitude=float(user_lat) if user_lat else None,
        user_longitude=float(user_lon) if user_lon else None,
    )

    # Step 6 — Telegram alert
    threshold = RiskThreshold.get_threshold()
    telegram_sent = False

    if should_send_alert(risk_score, threshold):
        contacts = get_prioritized_contacts(
            float(user_lat) if user_lat else None,
            float(user_lon) if user_lon else None,
        )
        contacts_with_telegram = [c for c in contacts if c.telegram_chat_id]
        if contacts_with_telegram:
            count = send_alerts_to_contacts(contacts_with_telegram, {
                **result,
                "wake_word": trigger_word_text,
                "transcript": transcript,
                "risk_level": risk_level,
            })
            telegram_sent = count > 0
            event.telegram_sent = telegram_sent
            event.save()

    return Response({
        "event_id": event.id,
        "transcript": transcript,
        "wake_word_detected": wake_word_detected,
        "wake_word": trigger_word_text,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "classification": result.get("classification"),
        "summary": result.get("summary"),
        "recommendations": result.get("recommendations", []),
        "alert_triggered": result.get("alert_triggered", False),
        "telegram_sent": telegram_sent,
        "threshold_used": threshold,
    }, status=200)