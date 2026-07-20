"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# Auto-run database migrations and seed default user on startup
try:
    print("Executing automatic database migrations...")
    call_command('migrate', interactive=False)
    print("Database migrations applied successfully.")

    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(is_superuser=True).exists():
        User.objects.create_superuser(
            username='admin@example.com',
            email='admin@example.com',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='User'
        )
        print("Initial admin created: admin@example.com / AdminPassword123!")
except Exception as e:
    print(f"Startup auto-migration notice: {e}")

