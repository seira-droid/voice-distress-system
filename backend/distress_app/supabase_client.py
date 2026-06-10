import environ
from supabase import create_client
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
env.read_env(BASE_DIR / ".env")


def get_supabase():
    url = env("SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise Exception("Missing Supabase env variables")

    return create_client(url, key)