import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test import RequestFactory
from distress_app.views import trigger_word

rf = RequestFactory()
request = rf.get('/api/v1/trigger-word/', HTTP_HOST='localhost')
try:
    response = trigger_word(request)
    print(f"Response status: {response.status_code}")
    print(f"Response content: {response.content.decode()}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()