#!/usr/bin/env python3
"""
Startup script for the Smart City backend.
This script ensures the backend_python module can be found and starts the server.
"""

import sys
import os

# Add the current directory to Python path so backend_python can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend_python")

sys.path.insert(0, backend_dir)

# Now import and run the app
from backend_python.main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend_python.main:app", host="0.0.0.0", port=8000, reload=True)