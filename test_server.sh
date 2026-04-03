#!/bin/bash

# Simple test to extract <a> tags from the catalog webpage
# Usage: ./test_catalog_links.sh

set -e

PORT=3003
URL="http://localhost:$PORT"
WAIT_TIME=5

echo "Starting Lume development server..."
${DENO_BIN:-deno} task serve &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
echo "Waiting $WAIT_TIME seconds for server to start..."
sleep $WAIT_TIME

echo "Fetching webpage from $URL..."
HTML_CONTENT=$(curl -s "$URL")

echo "Extracting <a> tags..."
# Extract all <a> tags with their href attributes
echo "$HTML_CONTENT" | grep -o '<a [^>]*href="[^"]*"[^>]*>' | while read -r link; do
    echo "$link"
done

echo -e "\nTotal <a> tags found: $(echo "$HTML_CONTENT" | grep -o '<a [^>]*href="[^"]*"[^>]*>' | wc -l)"

echo -e "\nStopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "Done"