import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler to return clean, consistent error responses.
    Formats HTTP exceptions, validation errors, and catches generic internal errors.
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize validation or HTTP errors
        detail = response.data
        if isinstance(detail, dict) and "detail" in detail:
            error_message = detail["detail"]
        else:
            error_message = "Validation or client request error."
        
        response.data = {
            "status_code": response.status_code,
            "error": "Client Error",
            "detail": error_message,
            "validation_errors": response.data if response.status_code == 400 else None
        }
    else:
        # Catch-all for unhandled server exceptions (HTTP 500)
        logger.critical(f"Unhandled Exception: {str(exc)}", exc_info=True)
        
        # In DEBUG mode, let Django's default handler output the trace for dev speed
        # But in production (DEBUG=False), we return a clean JSON payload
        from django.conf import settings
        if settings.DEBUG:
            return None  # Let Django raise the standard stack trace web page
            
        response = Response(
            {
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "error": "Internal Server Error",
                "detail": f"An unexpected error occurred: {str(exc)}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
