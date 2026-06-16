import uuid
from .services.ai_service import analyze_voice_event
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, FileUploadSerializer

from utils.supabase_client import get_supabase, upload_file


# -----------------------------
# Emergency Contact CRUD API
# -----------------------------
class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name", "relationship"]


# -----------------------------
# Trigger Word API (Supabase table)
# -----------------------------
@api_view(["GET", "PUT"])
def trigger_word(request):
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

            update_data = {
                "word": word
            }

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
                .insert({
                    "user_id": user_id,
                    "word": word,
                    "audio_url": audio_url
                })
                .execute()
            )

        return Response(result.data, status=200)


# -----------------------------
# FILE UPLOAD API (Supabase Storage)
# -----------------------------
@api_view(["POST"])
def upload_file_view(request):
    serializer = FileUploadSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    file = serializer.validated_data["file"]

    result = upload_file(file)

    return Response(
        {
            "message": "File uploaded successfully",
            "file_name": result["file_name"],
            "url": result["url"]
        },
        status=201
    )


# -----------------------------
# GET FILE URL API
# -----------------------------
@api_view(["GET"])
def get_file_url(request):
    file_name = request.query_params.get("file_name")

    if not file_name:
        return Response(
            {"error": "file_name is required"},
            status=400
        )

    supabase = get_supabase()

    bucket = supabase.storage.from_("distress-files")
    url = bucket.get_public_url(file_name)

    return Response(
        {
            "file_name": file_name,
            "url": url
        },
        status=200
    )


# -----------------------------
# VOICE ANALYSIS API (Mock)
# -----------------------------
@api_view(["POST"])
def analyze_voice(request):

    trigger_phrase_detected = request.data.get(
        "trigger_phrase_detected"
    )

    transcript = request.data.get(
        "transcript"
    )

    intensity_score = request.data.get(
        "intensity_score"
    )

    base_risk_score = request.data.get(
        "base_risk_score"
    )

    result = analyze_voice_event(
        trigger_phrase_detected=trigger_phrase_detected,
        transcript=transcript,
        intensity_score=intensity_score,
        base_risk_score=base_risk_score
    )

    return Response(
        result,
        status=status.HTTP_200_OK
    )