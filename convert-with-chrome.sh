#!/bin/bash
# Helper script to convert HTML to PDF using system Chrome

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME_PATH" ]; then
    echo "Google Chrome not found. Please install or use an online converter."
    exit 1
fi

if [ $# -ne 2 ]; then
    echo "Usage: $0 <input.html> <output.pdf>"
    exit 1
fi

INPUT=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
OUTPUT=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")

echo "Converting $INPUT to $OUTPUT..."
"$CHROME_PATH" --headless --disable-gpu --print-to-pdf="$OUTPUT" "$INPUT" 2>&1 | grep -v "DevTools"

if [ -f "$OUTPUT" ]; then
    echo "✓ PDF created: $OUTPUT"
    ls -lh "$OUTPUT"
else
    echo "✗ Failed to create PDF"
    exit 1
fi
