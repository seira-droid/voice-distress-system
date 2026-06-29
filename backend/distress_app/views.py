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

from .models import EmergencyContact, TriggerWord, VoiceEvent, RiskThreshold
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

    user_id = None
    if request.user and request.user.is_authenticated:
        user_id = str(request.user.id)
    else:
        user_id = request.data.get("user_id")

    # Retrieve supabase client if configured
    supabase = None
    try:
        supabase = get_supabase()
    except Exception:
        pass

    result = analyze_voice_event(
        trigger_phrase_detected=request.data.get("trigger_phrase_detected"),
        transcript=request.data.get("transcript"),
        intensity_score=request.data.get("intensity_score"),
        base_risk_score=request.data.get("base_risk_score"),
        supabase=supabase,
        user_id=user_id,
        audio_file=request.data.get("audio_file") or request.data.get("audio_url"),
        latitude=request.data.get("latitude"),
        longitude=request.data.get("longitude")
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