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

    file_content = file.read()

    supabase.storage.from_("distress-files").upload(
        path=filename,
        file=file_content,
        file_options={
    "content-type": "audio/wav"
}
    )

    public_url = supabase.storage.from_("distress-files").get_public_url(
        filename
    )

    if isinstance(public_url, dict):
        public_url = public_url.get("publicUrl")

    return {
        "message": "File uploaded successfully",
        "file_name": filename,
        "url": public_url
    }