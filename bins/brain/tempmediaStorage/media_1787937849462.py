import os
import sys
import uvicorn
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8787))
    host = os.getenv("HOST", "0.0.0.0")
    print("=" * 66)
    print("  TripTrail & NATPAC Mobile Travel Survey Platform (SIH 2025)")
    print("  Python FastAPI Backend + SQLite Database + Live Tourism APIs")
    print(f"  Server running at: http://localhost:{port}")
    print("=" * 66)
    uvicorn.run("backend.app:app", host=host, port=port, reload=True)
