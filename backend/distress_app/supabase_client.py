import environ
from supabase import create_client
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)


def get_supabase():
    url = env("SUPABASE_URL", default=None)
    key = env("SUPABASE_SERVICE_ROLE_KEY", default=None)

    if not url or not key:
        raise Exception("Missing Supabase env variables")

    return create_client(url, key)