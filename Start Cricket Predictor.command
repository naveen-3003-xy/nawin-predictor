#!/bin/bash
cd "$(dirname "$0")"

# A double-clicked .command file doesn't always get the same PATH as your
# normal Terminal, so look for Node directly in the common install spots.
for dir in /opt/homebrew/bin /usr/local/bin /usr/local/opt/node/bin "$HOME"/.nvm/versions/node/*/bin "$HOME"/.volta/bin; do
  [ -d "$dir" ] && export PATH="$dir:$PATH"
done

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js isn't installed on this Mac yet (or I couldn't find it)."
  echo ""
  echo "1. Go to https://nodejs.org"
  echo "2. Download and run the LTS installer (just click through it like any Mac app)"
  echo "3. Come back and double-click this file again"
  echo ""
  read -p "Press Enter to close this window..."
  exit 1
fi

# If an old copy of this app is still running (e.g. a previous window wasn't
# fully closed), it'll be holding onto port 3000 - free it up automatically.
EXISTING_PID=$(lsof -ti tcp:3000 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
  echo "An earlier copy of this app is still running - stopping it first..."
  kill $EXISTING_PID 2>/dev/null
  sleep 1
fi

if [ ! -d node_modules ]; then
  echo "Setting up (first run only, this takes a minute)..."
  npm install
fi

echo ""
echo "Starting NaWIN Predictor..."
echo "Once you see 'running at http://localhost:3000', open that link in your browser."
echo "Leave this window open while you use the app. Close it to stop the server."
echo ""
npm start

echo ""
read -p "Server stopped. Press Enter to close this window..."
