from rest_framework import serializers
from .models import EmergencyContact, VoiceEvent, AlertLog
import os


class EmergencyContactSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True
    )

    relationship = serializers.CharField(
        max_length=50,
        allow_blank=False,
        trim_whitespace=True
    )

    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'phone_number', 'relationship']

    def validate_phone_number(self, value):
        digits = value.replace("+", "").replace(" ", "").replace("-", "")

        if not digits.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only digits."
            )

        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError(
                "Phone number must be between 10 and 15 digits."
            )

        return value


class FileUploadSerializer(serializers.Serializer):
    """Validates uploaded audio files for voice analysis."""

    file = serializers.FileField()

    def validate_file(self, value):
        # Maximum file size: 10 MB
        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "File size must not exceed 10 MB."
            )

        allowed_extensions = [
            ".mp3",
            ".wav",
            ".m4a",
            ".ogg"
        ]

        ext = os.path.splitext(value.name)[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type: {ext}"
            )

        return value


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