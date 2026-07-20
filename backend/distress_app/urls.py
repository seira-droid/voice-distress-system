from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    trigger_word,
    trigger_word_list,
    trigger_word_add,
    trigger_word_update,
    trigger_word_delete,
    trigger_word_toggle,
    trigger_word_reset,
    upload_file_view,
    get_file_url,
    analyze_voice,
    EmergencyContactViewSet,
    record_and_analyze,
    events_list,
    risk_threshold,
)
from .auth_views import (
    register,
    login,
    logout,
    me,
    update_profile,
    update_password,
    run_migrations_endpoint,
)

router = DefaultRouter()
router.register(r"emergency-contacts", EmergencyContactViewSet, basename="emergency-contact")

urlpatterns = [
    path("", include(router.urls)),
    path("trigger-word/", trigger_word, name="trigger-word"),
    path("trigger-words/", trigger_word_list, name="trigger-word-list"),
    path("trigger-words/add/", trigger_word_add, name="trigger-word-add"),
    path("trigger-words/<int:trigger_id>/update/", trigger_word_update, name="trigger-word-update"),
    path("trigger-words/<int:trigger_id>/delete/", trigger_word_delete, name="trigger-word-delete"),
    path("trigger-words/<int:trigger_id>/toggle/", trigger_word_toggle, name="trigger-word-toggle"),
    path("trigger-words/reset/", trigger_word_reset, name="trigger-word-reset"),
    path("upload-file/", upload_file_view, name="upload-file"),
    path("file-url/", get_file_url, name="file-url"),
    path("voice/analyze/", analyze_voice, name="voice-analyze"),
    path("voice/record-analyze/", record_and_analyze, name="record-analyze"),
    path("events/", events_list, name="events-list"),
    path("risk-threshold/", risk_threshold, name="risk-threshold"),
    
    # Auth endpoints
    path("auth/register/", register, name="auth-register"),
    path("auth/login/", login, name="auth-login"),
    path("auth/logout/", logout, name="auth-logout"),
    path("auth/me/", me, name="auth-me"),
    path("auth/profile/", update_profile, name="auth-profile"),
    path("auth/password/", update_password, name="auth-password"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/migrate/", run_migrations_endpoint, name="auth-migrate"),
]

