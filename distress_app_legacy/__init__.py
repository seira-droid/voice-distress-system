import importlib, sys
_backend = importlib.import_module('backend.distress_app')
# Forward the distress_app package name to the backend implementation
sys.modules[__name__] = _backend
