"""Shared configuration: environment, MongoDB client, constants."""
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_HOURS = int(os.environ.get("ACCESS_TOKEN_HOURS", "72"))

APP_STORAGE_NAME = "abhyudaya-chaturbhuj"

# ---- Civic domain constants -------------------------------------------------
CATEGORIES = [
    "Pothole / Road Damage",
    "Garbage / Waste",
    "Broken Streetlight",
    "Water Leakage",
    "Drainage / Sewage",
    "Traffic / Road Obstruction",
    "Pollution",
    "Damaged Public Infrastructure",
    "Other",
]

SEVERITIES = ["Low", "Medium", "High", "Critical"]
SEVERITY_WEIGHT = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

STATUSES = ["Reported", "Verified", "In Progress", "Resolved"]

CONTRIBUTOR_TYPES = ["Citizen", "Student", "University", "Faculty", "Community Member", "Expert"]
