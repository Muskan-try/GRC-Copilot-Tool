from motor.motor_asyncio import AsyncIOMotorClient
import asyncpg
import os
from loguru import logger

mongo_client = None
mongo_db = None
pg_pool = None


async def connect_mongo():
    global mongo_client, mongo_db
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/grc_copilot")
    mongo_client = AsyncIOMotorClient(uri)
    mongo_db = mongo_client["grc_copilot"]
    logger.info("MongoDB connected (FastAPI)")


async def connect_postgres():
    global pg_pool
    dsn = os.getenv("PG_DSN", "postgresql://grc_user:grc_secure_password_2025@localhost:5432/grc_copilot")
    pg_pool = await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)
    logger.info("PostgreSQL connected (FastAPI)")


async def close_connections():
    global mongo_client, pg_pool
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")
    if pg_pool:
        await pg_pool.close()
        logger.info("PostgreSQL pool closed")
