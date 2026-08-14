#!/usr/bin/env bash
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
python3 - <<'EOF'
import time
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings

async def check_db():
    engine = create_async_engine(settings.DATABASE_URL)
    for attempt in range(30):
        try:
            async with engine.connect() as conn:
                print("✅ PostgreSQL is ready and accepting connections.")
                await engine.dispose()
                return True
        except Exception as e:
            print(f"Waiting for database (attempt {attempt+1}/30)... {e}")
            await asyncio.sleep(2)
    print("❌ Could not connect to PostgreSQL after 30 attempts.")
    await engine.dispose()
    sys.exit(1)

asyncio.run(check_db())
EOF

echo "🚀 Running database schema migrations (Alembic)..."
alembic upgrade head

echo "🌱 Seeding initial municipal master data and demo accounts..."
python3 scripts/seed.py || echo "Seeding script completed or skipped."

echo "🎉 Backend initialized. Starting service: $@"
exec "$@"
