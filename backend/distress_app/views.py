from utils.supabase_client import upload_file, get_supabase
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import viewsets, serializers
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle
import os
from drf_spectacular.utils import extend_schema

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
# TRIGGER WORD API (IMPORTANT FIX INCLUDED)
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
# FILE UPLOAD API (FIXED SWAGGER + MULTIPART)
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
    result = upload_file(file) or {}

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
from drf_spectacular.utils import extend_schema, OpenApiParameter

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
# -----------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def analyze_voice(request):

    throttle = BurstThrottle()
    if not throttle.allow_request(request, None):
        return Response({"detail": "Rate limit exceeded"}, status=429)

    data = request.data

    result = analyze_voice_event(
        trigger_phrase_detected=data["trigger_phrase_detected"],
        transcript=data["transcript"],
        intensity_score=data["intensity_score"],
        base_risk_score=data["base_risk_score"],
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
