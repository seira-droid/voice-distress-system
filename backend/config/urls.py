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