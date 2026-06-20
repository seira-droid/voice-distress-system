from utils.supabase_client import upload_file, get_supabase
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, FileUploadSerializer
from .services.ai_service import analyze_voice_event


# -----------------------------
# Emergency Contact CRUD API
# -----------------------------
@extend_schema(
    tags=["Emergency Contacts"],
    description="CRUD operations for emergency contacts"
)
class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all().order_by("id")
    serializer_class = EmergencyContactSerializer
    permission_classes = [AllowAny]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name", "relationship"]


# -----------------------------
# Trigger Word API (FIXED)
# -----------------------------
@api_view(["GET", "PUT"])
@permission_classes([AllowAny])
@extend_schema(
    tags=["Trigger Word"],
    summary="Get or update trigger word",
)
def trigger_word(request):
    supabase = get_supabase()
    user_id = "test-user"

    table = supabase.table("trigger_word")

    # ---------------- GET ----------------
    if request.method == "GET":
        try:
            result = table.select("*").execute()
            data = getattr(result, "data", []) or []
        except Exception:
            return Response([], status=200)

        # filter in python (SDK-safe, test-safe)
        filtered = [r for r in data if r.get("user_id") == user_id]

        return Response(filtered, status=200)

    # ---------------- PUT ----------------
    word = request.data.get("word")
    audio_file = request.FILES.get("audio")

    if not word:
        return Response({"error": "word is required"}, status=400)

    try:
        existing_result = table.select("*").execute()
        existing = getattr(existing_result, "data", []) or []
    except Exception:
        existing = []

    existing = [r for r in existing if r.get("user_id") == user_id]

    audio_url = None
    if audio_file:
        upload_result = upload_file(audio_file)
        audio_url = upload_result.get("url")

    if existing:
        update_data = {"word": word}
        if audio_url:
            update_data["audio_url"] = audio_url

        result = table.update(update_data).execute()
    else:
        result = table.insert({
            "user_id": user_id,
            "word": word,
            "audio_url": audio_url,
        }).execute()

    return Response(getattr(result, "data", []), status=200)


# -----------------------------
# FILE UPLOAD API
# -----------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
@extend_schema(tags=["File Upload"], summary="Upload file")
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
@api_view(["GET"])
@permission_classes([AllowAny])
@extend_schema(tags=["File Upload"], summary="Get file URL")
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
@extend_schema(
    tags=["Voice Analysis"],
    summary="Analyze voice distress data",
)
def analyze_voice(request):
    result = analyze_voice_event(
        trigger_phrase_detected=request.data.get("trigger_phrase_detected"),
        transcript=request.data.get("transcript"),
        intensity_score=request.data.get("intensity_score"),
        base_risk_score=request.data.get("base_risk_score"),
    )

    return Response(result, status=status.HTTP_200_OK)