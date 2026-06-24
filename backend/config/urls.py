from django.http import JsonResponse
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

# ✅ Root endpoint (MISSING IN YOUR CODE)
def home(request):
    return JsonResponse({
        "status": "running",
        "message": "Voice Distress System API is live"
    })

urlpatterns = [
    # ✅ FIX: root URL
    path('', home),

    path("api/", include("backend.distress_app.core.urls")),

    path('api/v1/', include('distress_app.urls')),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),

    path(
        'api/schema/swagger-ui/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui'
    ),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmergencyContactViewSet,
    trigger_word,
    upload_file_view,
    get_file_url,
    analyze_voice,
    record_and_analyze,   # ← add this
    risk_threshold,       # ← add this
    event_log,            # ← add this
)

router = DefaultRouter()
router.register(r"emergency-contacts", EmergencyContactViewSet)

urlpatterns = [
    path("", include(router.urls)),

    path("trigger-word/", trigger_word, name="trigger-word"),
    path("upload-file/", upload_file_view, name="upload-file"),
    path("file-url/", get_file_url, name="file-url"),
    path("voice/analyze/", analyze_voice, name="analyze-voice"),
    path("voice/record-analyze/", record_and_analyze, name="record-analyze"),  # ← add
    path("risk-threshold/", risk_threshold, name="risk-threshold"),            # ← add
    path("events/", event_log, name="event-log"),                              # ← add
]