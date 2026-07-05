import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()
from django.db import connection

# Add the email column to the database
with connection.cursor() as cursor:
    cursor.execute("ALTER TABLE distress_app_emergencycontact ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT ''")
    print('Email column added to database')