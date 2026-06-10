from supabase import create_client
import environ

env = environ.Env()

def get_supabase():
    return create_client(
        env("SUPABASE_URL"),
        env("SUPABASE_SERVICE_ROLE_KEY")
    )