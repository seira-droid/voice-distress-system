from distress_app.services.ai_service import analyze_voice_event
from supabase import create_client

# ⚠️ Replace these with your real credentials
SUPABASE_URL = "https://jgkgdofffjgerajhgxja.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna2dkb2ZmZmpnZXJhamhneGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDc5NzUsImV4cCI6MjA5NjM4Mzk3NX0.rDzkZaM1uojfURYrdUpem0eqLapTsj500QDA4MYYLC0"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def main():

    result = analyze_voice_event(
        trigger_phrase_detected=True,
        transcript="Someone is following me. Please help. I think they have a weapon.",
        intensity_score=90,
        base_risk_score=85,
        supabase=supabase,
        user_id="test-user"
    )

    print("\n===== AI PIPELINE TEST =====\n")

    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()