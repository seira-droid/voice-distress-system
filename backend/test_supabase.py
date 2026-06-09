from distress_app.supabase_client import supabase

response = supabase.table("django_migrations").select("*").limit(1).execute()

print(response.data)