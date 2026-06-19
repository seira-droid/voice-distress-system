from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiTypes,
)

from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, FileUploadSerializer
from .services.ai_service import analyze_voice_event

from utils.supabase_client import get_supabase, upload_file


# -----------------------------
# Emergency Contact CRUD API
# -----------------------------
@extend_schema(
    tags=["Emergency Contacts"],
    description="CRUD operations for emergency contacts"
)
class EmergencyContactViewSet(viewsets.ModelViewSet):
    """Provides CRUD operations for managing emergency contacts."""

    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    permission_classes = [AllowAny]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name", "relationship"]


# -----------------------------
# Trigger Word API
# -----------------------------
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
@extend_schema(
    tags=["Trigger Word"],
    summary="Get or update trigger word",
    description="Stores or retrieves user's emergency trigger word from Supabase",
)
def trigger_word(request):
    """Retrieves or updates the user's emergency trigger word."""

    supabase = get_supabase()
    user_id = "test-user"

    if request.method == "GET":
        result = (
            supabase.table("trigger_word")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return Response(result.data, status=200)

    if request.method == "PUT":
        word = request.data.get("word")
        audio_file = request.FILES.get("audio")

        if not word:
            return Response({"error": "word is required"}, status=400)

        existing = (
            supabase.table("trigger_word")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        audio_url = None

        if audio_file:
            upload_result = upload_file(audio_file)
            audio_url = upload_result.get("url")

        if existing.data:
            update_data = {"word": word}

            if audio_url:
                update_data["audio_url"] = audio_url

            result = (
                supabase.table("trigger_word")
                .update(update_data)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            result = (
                supabase.table("trigger_word")
                .insert(
                    {
                        "user_id": user_id,
                        "word": word,
                        "audio_url": audio_url,
                    }
                )
                .execute()
            )

        return Response(result.data, status=200)


# -----------------------------
# FILE UPLOAD API
# -----------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
@extend_schema(
    tags=["File Upload"],
    summary="Upload file",
)
def upload_file_view(request):
    """Uploads a file to Supabase storage and returns the public URL."""

    serializer = FileUploadSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    file = serializer.validated_data["file"]

    result = upload_file(file)

    return Response(
        {
            "message": "File uploaded successfully",
            "file_name": result["file_name"],
            "url": result["url"],
        },
        status=201,
    )


# -----------------------------
# GET FILE URL API
# -----------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
@extend_schema(
    tags=["File Upload"],
    summary="Get file URL",
)
def get_file_url(request):
    """Returns the public URL of an uploaded file."""

    file_name = request.query_params.get("file_name")

    if not file_name:
        return Response(
            {"error": "file_name is required"},
            status=400,
        )

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
@extend_schema(
    tags=["Voice Analysis"],
    summary="Analyze voice distress data",
)
def analyze_voice(request):
    """Processes voice distress data and returns a risk assessment result."""

    result = analyze_voice_event(
        trigger_phrase_detected=request.data.get("trigger_phrase_detected"),
        transcript=request.data.get("transcript"),
        intensity_score=request.data.get("intensity_score"),
        base_risk_score=request.data.get("base_risk_score"),
    )

    return Response(
        result,
        status=status.HTTP_200_OK,
    )