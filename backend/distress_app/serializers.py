from rest_framework import serializers
from .models import EmergencyContact, VoiceEvent, AlertLog

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = "__all__"


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
class VoiceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceEvent
        fields = "__all__"


class AlertLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertLog
        fields = "__all__"