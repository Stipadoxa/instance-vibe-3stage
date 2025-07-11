#!/bin/bash

# List all available pipeline runs with their user requests
# Usage: ./list_runs.sh

echo "📋 Available Pipeline Runs:"
echo ""

for file in python_outputs/alt3_*_1_user_request_analyzer_output.txt; do
    if [ -f "$file" ]; then
        # Extract timestamp
        TIMESTAMP=$(basename "$file" | sed 's/alt3_\([0-9_]*\)_1_user_request_analyzer_output.txt/\1/')
        
        # Format timestamp for display
        YEAR=${TIMESTAMP:0:4}
        MONTH=${TIMESTAMP:4:2}
        DAY=${TIMESTAMP:6:2}
        HOUR=${TIMESTAMP:9:2}
        MIN=${TIMESTAMP:11:2}
        SEC=${TIMESTAMP:13:2}
        
        FORMATTED_TIME="${YEAR}-${MONTH}-${DAY} ${HOUR}:${MIN}:${SEC}"
        
        # Get the user request (look for the actual request in the file)
        USER_REQUEST=$(grep -A 5 -B 5 "create\|build\|make\|design" "$file" | head -3 | tail -1 | sed 's/^[[:space:]]*//' | cut -c1-60)
        
        if [ -z "$USER_REQUEST" ]; then
            USER_REQUEST="(Request not found)"
        fi
        
        # Check if extracted files exist
        FIGMA_FILE="python_outputs/figma_ready_${TIMESTAMP}.json"
        RATIONALE_FILE="python_outputs/rationale_${TIMESTAMP}.txt"
        
        EXTRACTED_STATUS=""
        if [ -f "$FIGMA_FILE" ] && [ -f "$RATIONALE_FILE" ]; then
            EXTRACTED_STATUS=" ✅"
        fi
        
        echo "🕒 $FORMATTED_TIME [$TIMESTAMP]$EXTRACTED_STATUS"
        echo "   💭 $USER_REQUEST..."
        echo ""
    fi
done

echo "Legend: ✅ = Extracted files available in python_outputs/"
echo ""
echo "Usage:"
echo "  ./extract_figma_json.sh                    # Extract latest run"
echo "  ./extract_figma_json.sh 20250711_142227    # Extract specific run"
echo ""
echo "Files created:"
echo "  python_outputs/figma_ready_TIMESTAMP.json  # Clean JSON for Figma plugin"
echo "  python_outputs/rationale_TIMESTAMP.txt     # Complete rationales + original request"