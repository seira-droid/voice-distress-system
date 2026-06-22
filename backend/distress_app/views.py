from utils.supabase_client import upload_file, get_supabase
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status, serializers
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
import os
from rest_framework.parsers import MultiPartParser, FormParser
from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, FileUploadSerializer
from .services.ai_service import analyze_voice_event
from rest_framework.decorators import parser_classes
try:
    from django_ratelimit.decorators import ratelimit
except ImportError:
    # fallback decorator (no-op if package not available)
    def ratelimit(*args, **kwargs):
        def wrapper(func):
            return func
        return wrapper
# -----------------------------
# SERIALIZERS
# -----------------------------
class TriggerWordSerializer(serializers.Serializer):
    word = serializers.CharField(required=True)
    audio = serializers.FileField(required=False)


class AnalyzeVoiceRequestSerializer(serializers.Serializer):
    trigger_phrase_detected = serializers.BooleanField(required=True)

    transcript = serializers.CharField(
        required=True,
        max_length=5000,
        allow_blank=False,
        trim_whitespace=True
    )

    intensity_score = serializers.IntegerField(
        required=True,
        min_value=0,
        max_value=100
    )

    base_risk_score = serializers.IntegerField(
        required=True,
        min_value=0,
        max_value=100
    )


class AnalyzeVoiceResponseSerializer(serializers.Serializer):
    risk_level = serializers.CharField(required=False)
    score = serializers.IntegerField(required=False)


class DiagnoseResponseSerializer(serializers.Serializer):
    environment_variables = serializers.DictField()
    database_connection = serializers.CharField()
    supabase_initialization = serializers.CharField()


class FileURLSerializer(serializers.Serializer):
    file_name = serializers.CharField()
    url = serializers.CharField()


# -----------------------------
# Emergency Contact CRUD API
# -----------------------------
@extend_schema(tags=["Emergency Contacts"])
class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all().order_by("id")
    serializer_class = EmergencyContactSerializer
    permission_classes = [AllowAny]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name", "relationship"]


# -----------------------------
# Trigger Word API
# -----------------------------
@extend_schema(
    tags=["Trigger Word"],
    request=TriggerWordSerializer,
    responses=dict,
)
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
def trigger_word(request):
    supabase = get_supabase()
    user_id = "test-user"
    table = supabase.table("trigger_word")

    if request.method == "GET":
        result = table.select("*").execute()
        data = getattr(result, "data", []) or []
        return Response([r for r in data if r.get("user_id") == user_id])

    serializer = TriggerWordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    word = serializer.validated_data["word"]
    audio_file = request.FILES.get("audio")

    audio_url = None
    if audio_file:
        audio_url = (upload_file(audio_file) or {}).get("url")

    table.insert({
        "user_id": user_id,
        "word": word,
        "audio_url": audio_url,
    }).execute()

    return Response({"message": "updated"}, status=200)

# -----------------------------
# FILE UPLOAD API
# -----------------------------
from drf_spectacular.utils import OpenApiTypes, inline_serializer
@extend_schema(
    tags=["File Upload"],
    request=inline_serializer(
        name="FileUploadRequest",
        fields={
            "file": serializers.FileField(),
        },
    ),
    responses=dict,
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
@extend_schema(
    tags=["File Upload"],
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
@extend_schema(
    tags=["Voice Analysis"],
    request=AnalyzeVoiceRequestSerializer,
    responses=AnalyzeVoiceResponseSerializer,
)
@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def analyze_voice(request):

    serializer = AnalyzeVoiceRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

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
@extend_schema(
    tags=["Diagnostics"],
    responses=DiagnoseResponseSerializer,
)
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