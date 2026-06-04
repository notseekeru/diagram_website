#!/bin/bash

# Define the virtual environment directory
VENV_DIR=".venv"

# 1. Create the virtual environment if it does not exist

echo "⚙️ Creating virtual environment..."
python3 -m venv "$VENV_DIR"

# 2. Activate the virtual environment for your current shell
echo "🚀 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "✅ Environment ready! Run 'deactivate' to exit."