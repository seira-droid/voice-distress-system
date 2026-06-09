from supabase import create_client

url = "https://jgkgdofffjgerajhgxja.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna2dkb2ZmZmpnZXJhamhneGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDc5NzUsImV4cCI6MjA5NjM4Mzk3NX0.rDzkZaM1uojfURYrdUpem0eqLapTsj500QDA4MYYLC0"

supabase = create_client(url, key)

res = supabase.auth.sign_in_with_password({
    "email": "test@example.com",
    "password": "Test@12345"
})

print("USER:", res.user.id)
print("SESSION:", res.session is not None)
data = supabase.table("distress_app_emergencycontact").select("*").execute()

print("DATA:", data.data)