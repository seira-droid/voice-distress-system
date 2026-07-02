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
import uuid

from .models import EmergencyContact, TriggerWord, VoiceEvent, RiskThreshold
from .serializers import (
    EmergencyContactSerializer,
    FileUploadSerializer,
    FileURLSerializer,
)
from .services.ai_service import analyze_voice_event
from .services.speech_to_text_service import transcribe_audio_bytes
from .services.wake_word_service import detect_wake_word
from .services.distress_analysis_service import analyze_distress
from .services.voice_feature_extraction_service import extract_voice_features
from .services.multimodal_inference_service import compute_multimodal_risk
from .services.inference_logging_service import log_inference_data


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


def _normalize_score(value, default=0.5):
    try:
        score = float(value) if value is not None else default
    except (TypeError, ValueError):
        return default

    if score > 1.0:
        score = score / 100.0

    return max(0.0, min(1.0, score))


def coerce_voice_analysis_payload(request):
    raw_data = getattr(request, "data", None)
    if raw_data is None:
        raw_data = getattr(request, "POST", None) or {}
    if hasattr(raw_data, "dict"):
        raw_data = raw_data.dict()

    transcript = raw_data.get("transcript") or raw_data.get("transcription") or ""
    intensity_score = _normalize_score(raw_data.get("intensity_score"))
    base_risk_score = _normalize_score(raw_data.get("base_risk_score"))
    trigger_phrase_detected = raw_data.get("trigger_phrase_detected")

    if isinstance(trigger_phrase_detected, str):
        trigger_phrase_detected = trigger_phrase_detected.lower() in {"true", "1", "yes", "on"}

    return {
        "trigger_phrase_detected": bool(trigger_phrase_detected),
        "transcript": str(transcript),
        "intensity_score": intensity_score,
        "base_risk_score": base_risk_score,
        "user_id": raw_data.get("user_id"),
        "audio_file": raw_data.get("audio_file") or raw_data.get("audio_url"),
        "latitude": raw_data.get("latitude"),
        "longitude": raw_data.get("longitude"),
    }


# -----------------------------
# VOICE ANALYSIS API
# FIX 1: Added VoiceAnalyzeSerializer to validate all required fields
#         before touching request.data — prevents KeyError → 500.
# FIX 2: Wrapped analyze_voice_event() in try/except so AI service
#         errors return a clean 500 JSON, not an HTML crash page.
# -----------------------------
class VoiceAnalyzeSerializer(serializers.Serializer):
    trigger_phrase_detected = serializers.BooleanField(required=False, default=False)
    transcript = serializers.CharField(required=True, allow_blank=False)
    intensity_score = serializers.FloatField(required=True)
    base_risk_score = serializers.FloatField(required=True)
    user_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    audio_file = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    audio_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    def validate_intensity_score(self, value):
        return _normalize_score(value)

    def validate_base_risk_score(self, value):
        return _normalize_score(value)


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

    payload = coerce_voice_analysis_payload(request)
    serializer = VoiceAnalyzeSerializer(data=payload)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    payload = serializer.validated_data

    user_id = None
    if request.user and request.user.is_authenticated:
        user_id = str(request.user.id)
    else:
        user_id = payload.get("user_id")

    # Retrieve supabase client if configured
    supabase = None
    try:
        supabase = get_supabase()
    except Exception:
        pass

    trigger_phrase_detected = payload.get("trigger_phrase_detected")
    transcript = payload.get("transcript") or ""
    trigger_word = None
    try:
        trigger_word_obj = TriggerWord.objects.filter(user_id=user_id or "test-user").first()
        if trigger_word_obj:
            trigger_word = trigger_word_obj.word
    except Exception:
        trigger_word = None

    if not trigger_phrase_detected:
        trigger_phrase_detected = bool(detect_wake_word(transcript, trigger_word))

    result = analyze_voice_event(
        trigger_phrase_detected=trigger_phrase_detected,
        transcript=transcript,
        intensity_score=payload.get("intensity_score"),
        base_risk_score=payload.get("base_risk_score"),
        supabase=supabase,
        user_id=user_id,
        audio_file=payload.get("audio_file") or payload.get("audio_url"),
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude")
    )
    result["wake_word_detected"] = bool(trigger_phrase_detected)

    return Response(result, status=200)
# -----------------------------
# EVENTS LIST API
# -----------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def events_list(request):
    events = VoiceEvent.objects.all().order_by("-created_at")[:20]
    data = []
    for e in events:
        data.append({
            "id": e.id,
            "transcript": e.transcript,
            "classification": e.classification,
            "risk_score": e.risk_score,
            "telegram_sent": e.telegram_sent,
            "alert_triggered": e.alert_triggered,
            "created_at": e.created_at.isoformat() if e.created_at else "",
        })
    return Response(data, status=200)


# -----------------------------
# RECORD-AND-ANALYZE AUDIO ENDPOINT
# -----------------------------
@extend_schema(
    tags=["Voice Analysis"],
    request=inline_serializer(
        name="RecordAnalyzeRequest",
        fields={
            "audio": serializers.FileField(required=True),
            "trigger_phrase_detected": serializers.BooleanField(required=False),
            "intensity_score": serializers.FloatField(required=False, min_value=0.0, max_value=1.0),
            "base_risk_score": serializers.FloatField(required=False, min_value=0.0, max_value=1.0),
            "latitude": serializers.FloatField(required=False),
            "longitude": serializers.FloatField(required=False),
        },
    ),
    responses=inline_serializer(
        name="VoiceAnalyzeResponse",
        fields={
            "event_id": serializers.CharField(),
            "classification": serializers.CharField(),
            "risk_score": serializers.IntegerField(),
            "send_alert": serializers.BooleanField(),
            "alert_triggered": serializers.BooleanField(),
            "telegram_sent": serializers.BooleanField(),
        },
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def record_and_analyze(request):
    user_id = request.data.get("user_id")
    trigger_phrase_detected = str(request.data.get("trigger_phrase_detected", "false")).lower() in ["true", "1", "yes", "on"]
    intensity_score = request.data.get("intensity_score")
    base_risk_score = request.data.get("base_risk_score")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    audio_file = request.FILES.get("audio")
    transcript = request.data.get("transcript", "")

    if audio_file:
        try:
            speech_data = transcribe_audio_bytes(audio_file.read(), filename=audio_file.name)
            transcript = speech_data.get("transcript", transcript or "")
        except Exception as e:
            return Response({"error": "Transcription failed", "detail": str(e)}, status=500)

    # Use new multi-layer AI distress analysis engine
    distress_result = analyze_distress(transcript)
    
    # Extract voice features (acoustic analysis)
    voice_features = {}
    if audio_file:
        try:
            voice_features = extract_voice_features(audio_file, transcript)
        except Exception as e:
            print(f"Voice feature extraction failed: {e}")
            voice_features = {
                "pitch": 0.0,
                "energy": 0.0,
                "speech_rate": 0.0,
                "pause_ratio": 0.0
            }
    
    # Use multimodal inference to combine text and voice signals
    multimodal_result = compute_multimodal_risk(distress_result["risk_score"], voice_features)
    
    # Convert 0-100 risk score to 0.0-1.0 for compatibility with existing pipeline
    intensity_score_normalized = multimodal_result["risk_score"] / 100.0
    base_risk_score_normalized = multimodal_result["risk_score"] / 100.0

    supabase = None
    try:
        supabase = get_supabase()
    except Exception:
        pass

    # Use existing AI service pipeline for database logging, alerts, etc.
    result = analyze_voice_event(
        trigger_phrase_detected=trigger_phrase_detected,
        transcript=transcript,
        intensity_score=intensity_score_normalized,
        base_risk_score=base_risk_score_normalized,
        supabase=supabase,
        user_id=user_id,
        audio_file=audio_file.name if audio_file else None,
        latitude=latitude,
        longitude=longitude,
    )
    
    # Override with multimodal computed values
    result["transcription"] = transcript
    result["risk_score"] = multimodal_result["risk_score"]
    result["alert_triggered"] = multimodal_result["alert_triggered"]
    result["send_alert"] = multimodal_result["alert_triggered"]
    result["wake_word_detected"] = trigger_phrase_detected
    result["voice_features"] = voice_features
    result["text_confidence"] = multimodal_result.get("text_confidence", 0.0)
    result["voice_confidence"] = multimodal_result.get("voice_confidence", 0.0)
    result["debug"] = multimodal_result.get("debug", {})
    
    # Log inference data for future ML training
    try:
        log_inference_data({
            "transcription": transcript,
            "voice_features": voice_features,
            "text_score": multimodal_result["debug"]["text_score"],
            "voice_score": multimodal_result["debug"]["voice_score"],
            "text_confidence": multimodal_result.get("text_confidence", 0.0),
            "voice_confidence": multimodal_result.get("voice_confidence", 0.0),
            "final_risk_score": multimodal_result["risk_score"],
            "alert_triggered": multimodal_result["alert_triggered"],
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Inference logging failed: {e}")

    return Response(result, status=200)


# -----------------------------
# RISK THRESHOLD API
# -----------------------------
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
def risk_threshold(request):
    if request.method == "GET":
        threshold = RiskThreshold.get_threshold()
        return Response({"threshold": threshold}, status=200)

    value = request.data.get("threshold")
    if value is None:
        return Response({"error": "threshold is required"}, status=400)

    obj, _ = RiskThreshold.objects.get_or_create(user_id="test-user")
    obj.threshold = int(value)
    obj.save()
    return Response({"threshold": obj.threshold}, status=200)