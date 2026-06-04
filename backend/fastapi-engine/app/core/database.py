from motor.motor_asyncio import AsyncIOMotorClient
import asyncpg
import os
from loguru import logger

mongo_client = None
mongo_db = None
pg_pool = None


async def connect_mongo():
    global mongo_client, mongo_db
    try:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/grc_copilot")
        mongo_client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
        mongo_db = mongo_client["grc_copilot"]
        logger.info("MongoDB connection initialized (FastAPI)")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. FastAPI will run in standalone mode.")


def get_resolved_dsn(dsn: str) -> str:
    is_wsl = "WSL_DISTRO_NAME" in os.environ or os.path.exists("/proc/sys/fs/binfmt_misc/WSLPersonalities")
    if not is_wsl:
        try:
            with open("/proc/version", "r") as f:
                if "microsoft" in f.read().lower():
                    is_wsl = True
        except Exception:
            pass
            
    if is_wsl and ("localhost" in dsn or "127.0.0.1" in dsn):
        try:
            import subprocess
            result = subprocess.run(["ip", "route"], capture_output=True, text=True, check=True)
            for line in result.stdout.split("\n"):
                if "default via" in line:
                    gateway = line.split("via")[1].strip().split()[0]
                    resolved = dsn.replace("localhost", gateway).replace("127.0.0.1", gateway)
                    logger.info(f"Dynamically resolved WSL host gateway to {gateway} for Postgres DSN")
                    return resolved
        except Exception as e:
            logger.warning(f"Failed to dynamically resolve WSL host gateway: {e}")
    return dsn


async def connect_postgres():
    global pg_pool
    try:
        dsn = os.getenv("PG_DSN", "postgresql://grc_user:grc_secure_password_2025@localhost:5432/grc_copilot")
        resolved_dsn = get_resolved_dsn(dsn)
        pg_pool = await asyncpg.create_pool(dsn=resolved_dsn, min_size=2, max_size=10, timeout=2.0)
        logger.info("PostgreSQL pool initialized (FastAPI)")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed: {e}. FastAPI will run in standalone mode.")


async def close_connections():
    global mongo_client, pg_pool
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")
    if pg_pool:
        await pg_pool.close()
        logger.info("PostgreSQL pool closed")
