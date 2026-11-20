from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import CollectionInvalid
from app.core.config import settings
from app.core.logging import logger

_client: Optional[MongoClient] = None
_db: Optional[Database] = None

def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        logger.info(f"Connecting to MongoDB Atlas (database: {settings.MONGODB_DB_NAME})...")
        _client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=1500,
            connectTimeoutMS=1500,
            socketTimeoutMS=5000,
            maxPoolSize=20,
            retryWrites=True
        )
    return _client

def get_database(db_name: Optional[str] = None) -> Database:
    global _db
    if db_name:
        return get_mongo_client()[db_name]
    if _db is None:
        _db = get_mongo_client()[settings.MONGODB_DB_NAME]
    return _db

def init_time_series_collections(db: Database) -> None:
    """Create native time-series collection for sensor readings if not exists."""
    existing = db.list_collection_names()
    if "sensor_readings" not in existing:
        try:
            db.create_collection(
                "sensor_readings",
                timeseries={
                    "timeField": "ts",
                    "metaField": "meta",
                    "granularity": "minutes"
                }
            )
            logger.info("Successfully created native time-series collection 'sensor_readings'.")
        except CollectionInvalid:
            pass
        except Exception as e:
            logger.warning(f"Could not create timeseries collection directly: {e}. Falling back to standard collection if exists.")

def close_mongo_connection() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection pool closed.")
