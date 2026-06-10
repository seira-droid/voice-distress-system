from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmergencyContactViewSet,
    trigger_word,
    upload_file_view,
    get_file_url,
)

router = DefaultRouter()
router.register(
    r"emergency-contacts",
    EmergencyContactViewSet,
    basename="emergency-contact"
)

urlpatterns = [
    path("", include(router.urls)),

    path("v1/trigger-word/", trigger_word),
    path("v1/upload-file/", upload_file_view),
    path("v1/file-url/", get_file_url),
]