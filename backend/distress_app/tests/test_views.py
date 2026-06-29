import pytest
from unittest.mock import patch

from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from distress_app.models import EmergencyContact, TriggerWord


# -----------------------------
# EMERGENCY CONTACT TESTS
# -----------------------------

@pytest.mark.django_db
def test_emergency_contact_list():
    EmergencyContact.objects.create(
        name="Alice",
        phone_number="1234567890",
        relationship="Friend",
    )

    client = APIClient()
    response = client.get("/api/v1/emergency-contacts/")

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["name"] == "Alice"


@pytest.mark.django_db
def test_emergency_contact_create():
    client = APIClient()

    payload = {
        "name": "Bob",
        "phone_number": "9876543210",
        "relationship": "Brother",
    }

    response = client.post(
        "/api/v1/emergency-contacts/",
        payload,
        format="json",
    )

    assert response.status_code in [200, 201]

    assert EmergencyContact.objects.count() == 1

    contact = EmergencyContact.objects.first()

    assert contact.name == "Bob"
    assert contact.phone_number == "9876543210"
    assert contact.relationship == "Brother"


# -----------------------------
# FILE UPLOAD TEST
# -----------------------------

@pytest.mark.django_db
@patch("distress_app.views.upload_file")
def test_upload_file_view_success(mock_upload):
    mock_upload.return_value = {
        "file_name": "test.wav",
        "url": "https://example.com/test.wav",
    }

    client = APIClient()

    file = SimpleUploadedFile(
        "test.wav",
        b"fake audio content",
        content_type="audio/wav",
    )

    response = client.post(
        "/api/v1/upload-file/",
        {"file": file},
        format="multipart",
    )

    assert response.status_code == 201

    data = response.json()

    assert data["file_name"] == "test.wav"
    assert data["url"] == "https://example.com/test.wav"


# -----------------------------
# GET FILE URL TEST
# -----------------------------

@pytest.mark.django_db
@patch("distress_app.views.get_supabase")
def test_get_file_url_success(mock_get_supabase):
    mock_bucket = (
        mock_get_supabase.return_value.storage.from_.return_value
    )

    mock_bucket.get_public_url.return_value = (
        "https://example.com/test.wav"
    )

    client = APIClient()

    response = client.get("/api/v1/file-url/?file_name=test.wav")

    assert response.status_code == 200

    data = response.json()

    assert data["file_name"] == "test.wav"
    assert data["url"] == "https://example.com/test.wav"


# -----------------------------
# TRIGGER WORD TESTS (FIXED)
# -----------------------------

@pytest.mark.django_db
def test_trigger_word_get():
    client = APIClient()

    response = client.get("/api/v1/trigger-word/")

    assert response.status_code == 200

    data = response.json()

    assert data == {"word": "help"}


@pytest.mark.django_db
def test_trigger_word_put_updates_word():
    client = APIClient()

    response = client.put(
        "/api/v1/trigger-word/",
        {"word": "save me"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json() == {"word": "save me"}
    assert TriggerWord.objects.get(user_id="test-user").word == "save me"


@pytest.mark.django_db
def test_trigger_word_put_rejects_blank_word():
    client = APIClient()

    response = client.put(
        "/api/v1/trigger-word/",
        {"word": "   "},
        format="json",
    )

    assert response.status_code == 400
