import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from distress_app.models import (
    EmergencyContact,
    VoiceEvent,
    AlertLog,
)
from distress_app.serializers import (
    EmergencyContactSerializer,
    FileUploadSerializer,
    VoiceEventSerializer,
    AlertLogSerializer,
)


@pytest.mark.django_db
def test_emergency_contact_serializer_valid():

    data = {
        "name": "John",
        "phone_number": "9876543210",
        "relationship": "Brother",
    }

    serializer = EmergencyContactSerializer(data=data)

    assert serializer.is_valid()


@pytest.mark.django_db
def test_voice_event_serializer_valid():

    data = {
        "audio_file": "audio.wav",
        "distress_keyword": "help",
    }

    serializer = VoiceEventSerializer(data=data)

    assert serializer.is_valid()


@pytest.mark.django_db
def test_alert_log_serializer_valid():

    contact = EmergencyContact.objects.create(
        name="John",
        phone_number="9876543210",
        relationship="Brother",
    )

    event = VoiceEvent.objects.create(
        audio_file="audio.wav",
        distress_keyword="help",
    )

    data = {
        "voice_event": event.id,
        "contact": contact.id,
        "message_sent": "Emergency alert",
    }

    serializer = AlertLogSerializer(data=data)

    assert serializer.is_valid()


def test_file_upload_serializer_valid():

    file = SimpleUploadedFile(
        "audio.wav",
        b"audio content"
    )

    serializer = FileUploadSerializer(
        data={"file": file}
    )

    assert serializer.is_valid()