import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from backend.distress_app.serializers import EmergencyContactSerializer, FileUploadSerializer
from backend.distress_app.models import EmergencyContact

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(username='testuser', password='testpass')

@pytest.fixture
def api_client(user):
    client = APIClient()
    # Obtain JWT token
    response = client.post('/api/token/', {'username': 'testuser', 'password': 'testpass'}, format='json')
    token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    return client

def test_emergency_contact_serializer(db):
    contact = EmergencyContact.objects.create(name='John Doe', phone_number='1234567890', relationship='friend')
    serializer = EmergencyContactSerializer(contact)
    data = serializer.data
    assert data['name'] == 'John Doe'
    assert data['phone_number'] == '1234567890'
    assert data['relationship'] == 'friend'

def test_file_upload_serializer():
    # Simulate a simple file upload using django's SimpleUploadedFile
    from django.core.files.uploadedfile import SimpleUploadedFile
    file = SimpleUploadedFile('test.txt', b'hello world', content_type='text/plain')
    serializer = FileUploadSerializer(data={'file': file})
    assert serializer.is_valid()
