#!/usr/bin/env python
"""Root-level manage.py placeholder for pytest-django.
This file enables pytest-django to locate the Django project when the actual
manage.py resides in the `backend` subdirectory. It simply imports the real
manage script so that Django commands (e.g., `manage.py migrate`) continue to
work from the project root.
"""
import os
import sys
# Ensure the backend package is on the path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)
# Execute the original manage script if this file is run directly
if __name__ == "__main__":
    from backend import manage as real_manage
    real_manage.main()
