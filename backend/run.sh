#!/bin/bash
# Always run the backend using the virtual environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/venv/bin/python" "$SCRIPT_DIR/main.py"
