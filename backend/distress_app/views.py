from utils.supabase_client import upload_file, get_supabase
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status, serializers
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
import os

from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, FileUploadSerializer
from .services.ai_service import analyze_voice_event


# -----------------------------
# SERIALIZERS
# -----------------------------
class TriggerWordSerializer(serializers.Serializer):
    word = serializers.CharField(required=True)
    audio = serializers.FileField(required=False)


class UploadResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    file_name = serializers.CharField(allow_null=True)
    url = serializers.CharField(allow_null=True)


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
    summary="Get or update trigger word",
    request=TriggerWordSerializer,
)
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
def trigger_word(request):
    supabase = get_supabase()
    user_id = "test-user"
    table = supabase.table("trigger_word")

    if request.method == "GET":
        try:
            result = table.select("*").execute()
            data = getattr(result, "data", []) or []
        except Exception:
            return Response([], status=200)

        filtered = [r for r in data if r.get("user_id") == user_id]
        return Response(filtered, status=200)

    serializer = TriggerWordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    word = serializer.validated_data["word"]
    audio_file = request.FILES.get("audio")

    existing = []
    try:
        existing_result = table.select("*").execute()
        existing = getattr(existing_result, "data", []) or []
    except Exception:
        pass

    existing = [r for r in existing if r.get("user_id") == user_id]

    audio_url = None
    if audio_file:
        upload_result = upload_file(audio_file)
        audio_url = upload_result.get("url")

    if existing:
        update_data = {"word": word}
        if audio_url:
            update_data["audio_url"] = audio_url

        result = table.update(update_data).eq("user_id", user_id).execute()
    else:
        result = table.insert({
            "user_id": user_id,
            "word": word,
            "audio_url": audio_url,
        }).execute()

    return Response(getattr(result, "data", []), status=200)


# -----------------------------
# FILE UPLOAD API (FIXED)
# -----------------------------
@extend_schema(
    tags=["File Upload"],
    summary="Upload file",
    request=FileUploadSerializer,
    responses=UploadResponseSerializer,
)
@api_view(["POST"])
@permission_classes([AllowAny])
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
@extend_schema(tags=["File Upload"])
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
        {"file_name": file_name, "url": url},
        status=200,
    )


# -----------------------------
# VOICE ANALYSIS API
# -----------------------------
@extend_schema(tags=["Voice Analysis"])
@api_view(["POST"])
@permission_classes([AllowAny])
def analyze_voice(request):
    result = analyze_voice_event(
        trigger_phrase_detected=request.data.get("trigger_phrase_detected"),
        transcript=request.data.get("transcript"),
        intensity_score=request.data.get("intensity_score"),
        base_risk_score=request.data.get("base_risk_score"),
    )

    return Response(result, status=status.HTTP_200_OK)


# -----------------------------
# DIAGNOSTICS API
# -----------------------------
@extend_schema(tags=["Diagnostics"])
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