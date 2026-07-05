import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection

# Add the is_active column
with connection.cursor() as cursor:
    cursor.execute("ALTER TABLE distress_app_triggerword ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
    cursor.execute("ALTER TABLE distress_app_triggerword ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()")
    cursor.execute("UPDATE distress_app_triggerword SET is_active = TRUE WHERE is_active IS NULL")

print("✅ is_active column added to TriggerWord table")

# Verify
cursor = connection.cursor()
cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'distress_app_triggerword'")
columns = [row[0] for row in cursor.fetchall()]
print("TriggerWord columns:", columns)