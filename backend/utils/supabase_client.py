import uuid
import os
from django.conf import settings
from supabase import create_client

MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
}

def get_supabase():
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


def upload_file(file):
    supabase = get_supabase()

    ext = os.path.splitext(file.name)[1].lower()
    filename = f"{uuid.uuid4()}{ext}"

    file_content = file.read()

    content_type = MIME_TYPES.get(ext, "application/octet-stream")  # ← fix

    supabase.storage.from_("distress-files").upload(
        path=filename,
        file=file_content,
        file_options={"content-type": content_type}  # ← fix
    )

    public_url = supabase.storage.from_("distress-files").get_public_url(filename)

    if isinstance(public_url, dict):
        public_url = public_url.get("publicUrl")

    return {
        "message": "File uploaded successfully",
        "file_name": filename,
        "url": public_url
    }