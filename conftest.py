import os, sys
# Add the repository root to PYTHONPATH so that the "backend" namespace package can be imported by pytest-django
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)
