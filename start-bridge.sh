#!/bin/bash

# Figma Bridge Server Startup Script

echo "🌉 Starting Figma Bridge Server..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing required packages..."
    npm init -y 2>/dev/null
    npm install express cors
fi

# Start the bridge server
echo "🚀 Bridge server starting on http://localhost:8003"
echo "📨 Ready to receive JSON from Python pipeline"
echo "📤 Ready to forward JSON to Figma plugin"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node figma-bridge-server.js