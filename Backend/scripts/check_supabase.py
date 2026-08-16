import asyncio
import sys
import os

# Add parent directory to path so core package can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from core.config import settings
from core.db.session import engine


async def check_supabase_connection():
    print("=" * 60)
    print(" 🔍 Testing Supabase Database Connection...")
    print("=" * 60)
    
    # Hide password in connection string for display
    db_url_safe = settings.DATABASE_URL
    if "@" in db_url_safe:
        user_part, host_part = db_url_safe.split("@", 1)
        scheme_user = user_part.split(":")[0] + "://***:***"
        db_url_safe = f"{scheme_user}@{host_part}"
    
    print(f"Target DB URL : {db_url_safe}")
    print(f"AI Provider   : {settings.AI_PROVIDER}")
    print("-" * 60)

    try:
        async with engine.begin() as conn:
            # 1. Test basic connectivity & PostgreSQL version
            result = await conn.execute(text("SELECT current_database(), current_user, version();"))
            row = result.fetchone()
            db_name, db_user, pg_version = row[0], row[1], row[2]
            
            print(f"✅ Connection Status : CONNECTED SUCCESSFULLY")
            print(f"   Database Name     : {db_name}")
            print(f"   Database User     : {db_user}")
            print(f"   Postgres Version  : {pg_version.split(',')[0]}")
            
            # 2. Check installed tables in public schema
            tables_res = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [r[0] for r in tables_res.fetchall()]
            
            print(f"\n📊 Public Tables Found ({len(tables)}):")
            if tables:
                for t in tables:
                    count_res = await conn.execute(text(f'SELECT count(*) FROM "{t}";'))
                    count = count_res.scalar()
                    print(f"   • {t:<25} : {count} rows")
            else:
                print("   (No tables created yet. They will be auto-created on application startup)")
                
        print("\n" + "=" * 60)
        print(" 🎉 Your Supabase Database is fully connected and ready!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n❌ Connection Failed!")
        print(f"   Error: {e}")
        print("\n💡 Troubleshooting Tips:")
        print("   1. Verify your Supabase DB password is correct.")
        print("   2. For Supabase, use the Pooler connection string:")
        print("      postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")
        print("   3. Ensure DATABASE_URL is set in Backend/.env (for local) or Render Environment variables.")
        print("=" * 60)
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    success = asyncio.run(check_supabase_connection())
    sys.exit(0 if success else 1)
