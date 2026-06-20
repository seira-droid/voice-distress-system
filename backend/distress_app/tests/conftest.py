import sys
from types import ModuleType


def mock_supabase():
    module = ModuleType("supabase")

    class Auth:
        def sign_in_with_password(self, *args, **kwargs):
            return {
            "user": {
                "id": "test-user"
            },
            "session": {
                "access_token": "fake-token"
            }
        }

    class TableQuery:
        def select(self, *args, **kwargs):
            return self

    def execute(self):
        return {"data": []}


class Client:
    def __init__(self):
        self.auth = Auth()

    def table(self, name):
        return TableQuery()

def mock_dotenv():
    module = ModuleType("dotenv")
    module.load_dotenv = lambda *args, **kwargs: None
    sys.modules["dotenv"] = module


def mock_groq():
    module = ModuleType("groq")
    module.Groq = object
    sys.modules["groq"] = module


mock_supabase()
mock_dotenv()
mock_groq()