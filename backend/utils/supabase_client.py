import uuid
import os
import tempfile
from django.conf import settings
from supabase import create_client


def get_supabase():
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


def upload_file(file):
    supabase = get_supabase()

    ext = os.path.splitext(file.name)[1]
    filename = f"{uuid.uuid4()}{ext}"

    tmp_path = None

    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            for chunk in file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        # Upload to Supabase
        supabase.storage.from_("distress-files").upload(
            filename,
            tmp_path,
            {
                "content-type": file.content_type
            }
        )

        # Get public URL safely
        bucket = supabase.storage.from_("distress-files")
        public_url_data = bucket.get_public_url(filename)

        # Normalize URL (important fix)
        url = (
            public_url_data.get("publicUrl")
            if isinstance(public_url_data, dict)
            else public_url_data
        )

        return {
            "message": "File uploaded successfully",
            "file_name": filename,
            "url": url
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)