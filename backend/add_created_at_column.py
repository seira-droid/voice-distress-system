"""
Script to add created_at column to EmergencyContact table in Supabase PostgreSQL.
"""
import os
import sys
import psycopg2

# Get database URL from environment
database_url = os.environ.get('DATABASE_URL', 'postgresql://postgres.jgkgdofffjgerajhgxja:OfCEqm2M0uhCgu4Y@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres')

try:
    # Connect to the database
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'distress_app_emergencycontact' 
        AND column_name = 'created_at'
    """)
    
    if cursor.fetchone():
        print("Column 'created_at' already exists in distress_app_emergencycontact")
    else:
        # Add the column
        cursor.execute("""
            ALTER TABLE distress_app_emergencycontact 
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW()
        """)
        conn.commit()
        print("Column 'created_at' added to distress_app_emergencycontact")
        
        # Set default value for existing rows
        cursor.execute("""
            UPDATE distress_app_emergencycontact 
            SET created_at = NOW() 
            WHERE created_at IS NULL
        """)
        conn.commit()
        print("Set default created_at values for existing rows")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()