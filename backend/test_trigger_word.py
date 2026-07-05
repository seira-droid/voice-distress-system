import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection

# Check TriggerWord table columns
cursor = connection.cursor()
cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'distress_app_triggerword'")
columns = [row[0] for row in cursor.fetchall()]
print("TriggerWord columns:", columns)

# Check if is_active column exists
if 'is_active' in columns:
    print("✅ is_active column exists")
else:
    print("❌ is_active column MISSING - adding it now")
    cursor.execute("ALTER TABLE distress_app_triggerword ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
    print("✅ is_active column added")

# Check existing data
from distress_app.models import TriggerWord
triggers = TriggerWord.objects.all()
print(f"Total trigger words: {triggers.count()}")
for t in triggers:
    print(f"  - {t.word} (is_active: {t.is_active})")

# Test the endpoint
from django.test import RequestFactory
from distress_app.views import trigger_word

rf = RequestFactory()
request = rf.get('/api/v1/trigger-word/', HTTP_HOST='localhost')
try:
    response = trigger_word(request)
    print(f"Response status: {response.status_code}")
    print(f"Response content: {response.content[:500]}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()