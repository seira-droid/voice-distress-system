from rest_framework import serializers
from .models import EmergencyContact, VoiceEvent, AlertLog


class EmergencyContactSerializer(serializers.ModelSerializer):
    """Serializes emergency contact data for API requests and responses."""

    class Meta:
        model = EmergencyContact
        fields = "__all__"


class FileUploadSerializer(serializers.Serializer):
    """Validates uploaded audio files for voice analysis."""

    file = serializers.FileField()


class VoiceEventSerializer(serializers.ModelSerializer):
    """Serializes voice event records and analysis data."""

    class Meta:
        model = VoiceEvent
        fields = "__all__"


class AlertLogSerializer(serializers.ModelSerializer):
    """Serializes alert log records for emergency notifications."""

    class Meta:
        model = AlertLog
        fields = "__all__"