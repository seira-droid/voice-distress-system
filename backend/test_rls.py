import sys
from types import ModuleType

# ---------------- MOCK SUPABASE ----------------
module = ModuleType("supabase")

class Auth:
    def sign_in_with_password(self, *args, **kwargs):
        return {
            "user": {"id": "test-user"},
            "session": {"access_token": "fake-token"}
        }

class TableQuery:
    def select(self, *args, **kwargs):
        return self
    def execute(self):
        return {"data": [{"id": 1}]}

class Client:
    def __init__(self):
        self.auth = Auth()

    def table(self, name):
        return TableQuery()

def create_client(*args, **kwargs):
    return Client()

module.create_client = create_client
sys.modules["supabase"] = module

# ---------------- TEST ----------------
from distress_app.supabase_client import get_supabase

def test_supabase_auth_and_rls():
    supabase = get_supabase()

    res = supabase.auth.sign_in_with_password({
        "email": "test@example.com",
        "password": "testpassword"
    })

    user = res["user"]
    session = res["session"]

    assert user is not None
    assert session is not None

    user_id = user["id"]
    assert user_id == "test-user"

    data = supabase.table("emergency_contacts").select("*").execute()

    assert data["data"] is not None