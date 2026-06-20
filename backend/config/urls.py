from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # FIX: ALL API ROUTES LIVE HERE
    path("api/v1/", include("distress_app.urls")),
]