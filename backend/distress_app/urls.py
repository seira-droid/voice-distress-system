from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    trigger_word,
    upload_file_view,
    get_file_url,
    analyze_voice,
    EmergencyContactViewSet,
)

router = DefaultRouter()
router.register(r"emergency-contacts", EmergencyContactViewSet, basename="emergency-contact")

urlpatterns = [
    path("", include(router.urls)),
    path("trigger-word/", trigger_word, name="trigger-word"),
    path("upload-file/", upload_file_view, name="upload-file"),
    path("file-url/", get_file_url, name="file-url"),
    path("voice/analyze/", analyze_voice, name="voice-analyze"),
]