from distress_app.supabase_client import get_supabase


def test_supabase_function_exists():
    assert callable(get_supabase)