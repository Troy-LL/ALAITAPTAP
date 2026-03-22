import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./saferoute.db")

# App Settings
APP_ENV = os.getenv("APP_ENV", "development")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://saferoute-asean.vercel.app").split(",")

# Safety scorer: set SAFETY_IGNORE_CRIME=1 to score routes from public infrastructure (safe spots CSV)
# only, ignoring crime_incidents. Set SAFETY_USE_OSM_FILE=1 only if export.geojson is NOT merged into
# safe_spots.csv (avoids double-counting OSM bonuses vs DB spots).
SAFETY_IGNORE_CRIME = os.getenv("SAFETY_IGNORE_CRIME", "0") == "1"
SAFETY_USE_OSM_FILE = os.getenv("SAFETY_USE_OSM_FILE", "0") == "1"
