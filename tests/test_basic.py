"""
Basic tests to verify the CI pipeline and Django setup.
"""
import pytest
from django.test import TestCase


class TestCIPipeline(TestCase):
    """Verify the CI pipeline is working correctly."""

    def test_django_setup(self):
        """Verify Django is properly configured."""
        from django.conf import settings
        assert settings.DEBUG is not None

    def test_installed_apps(self):
        """Verify required apps are installed."""
        from django.conf import settings
        assert 'backend.distress_app' in settings.INSTALLED_APPS
        assert 'rest_framework' in settings.INSTALLED_APPS

    def test_database_connection(self):
        """Verify database is accessible."""
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            assert result[0] == 1


@pytest.mark.django_db
class TestDistressAppExists:
    """Verify the backend.distress_app is properly registered."""

    def test_app_config(self):
        """Verify backend.distress_app is loadable."""
        from django.apps import apps
        assert apps.is_installed('backend.distress_app')
