from supabase import create_client
import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

env = environ.Env()
env.read_env(BASE_DIR.parent / ".env")

supabase = create_client(
    env("SUPABASE_URL"),
    env("SUPABASE_ANON_KEY")
)