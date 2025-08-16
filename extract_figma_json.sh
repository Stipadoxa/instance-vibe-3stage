#!/bin/bash

# Extract Figma-ready JSON and rationales from pipeline output
# Usage: ./extract_figma_json.sh [timestamp]
# If no timestamp provided, uses latest run

TARGET_TIMESTAMP=$1

if [ -z "$TARGET_TIMESTAMP" ]; then
    # Find the latest output files
    STAGE2_FILE=$(ls -t python_outputs/alt3_*_2_ux_ui_designer_output.txt | head -1)
    STAGE3_FILE=$(ls -t python_outputs/alt3_*_3_json_engineer_output.txt | head -1)
    
    if [ ! -f "$STAGE2_FILE" ] || [ ! -f "$STAGE3_FILE" ]; then
        echo "❌ No output files found in python_outputs/"
        exit 1
    fi
    
    # Extract timestamp from filename
    TIMESTAMP=$(basename "$STAGE3_FILE" | sed 's/alt3_\([0-9_]*\)_3_json_engineer_output.txt/\1/')
else
    # Use specified timestamp
    TIMESTAMP=$TARGET_TIMESTAMP
    STAGE2_FILE="python_outputs/alt3_${TIMESTAMP}_2_ux_ui_designer_output.txt"
    STAGE3_FILE="python_outputs/alt3_${TIMESTAMP}_3_json_engineer_output.txt"
    
    if [ ! -f "$STAGE2_FILE" ] || [ ! -f "$STAGE3_FILE" ]; then
        echo "❌ Files not found for timestamp: $TIMESTAMP"
        echo "Available runs:"
        ls python_outputs/alt3_*_3_json_engineer_output.txt | sed 's/.*alt3_\([0-9_]*\)_3_json_engineer_output.txt/  \1/'
        exit 1
    fi
fi

# Create timestamped output files
FIGMA_JSON_FILE="figma-ready/figma_ready_${TIMESTAMP}.json"
FIGMA_JSON_PYTHON_FILE="python_outputs/figma_ready_${TIMESTAMP}.json"
RATIONALE_FILE="figma-ready/rationale_${TIMESTAMP}.txt"
RATIONALE_PYTHON_FILE="python_outputs/rationale_${TIMESTAMP}.txt"

echo "📁 Extracting from pipeline run: $TIMESTAMP"
echo "   Stage 2: $STAGE2_FILE"
echo "   Stage 3: $STAGE3_FILE"
echo ""

# Save rationales to timestamped files (both root and python_outputs)
echo "=== PIPELINE RUN: $TIMESTAMP ===" > "$RATIONALE_FILE"
echo "=== PIPELINE RUN: $TIMESTAMP ===" > "$RATIONALE_PYTHON_FILE"
echo "" >> "$RATIONALE_FILE"
echo "" >> "$RATIONALE_PYTHON_FILE"

# Get the original user request from user-request.txt at the time of the run
echo "📝 Original User Request:" >> "$RATIONALE_FILE"
echo "📝 Original User Request:" >> "$RATIONALE_PYTHON_FILE"

# Try to get from current user-request.txt (if this is the latest run)
LATEST_TIMESTAMP=$(ls -t python_outputs/alt3_*_3_json_engineer_output.txt | head -1 | sed 's/.*alt3_\([0-9_]*\)_3_json_engineer_output.txt/\1/')
if [ "$TIMESTAMP" = "$LATEST_TIMESTAMP" ] && [ -f "user-request.txt" ]; then
    cat user-request.txt >> "$RATIONALE_FILE"
    cat user-request.txt >> "$RATIONALE_PYTHON_FILE"
else
    # For older runs, extract from the Stage 1 input section (if available)
    USER_REQUEST_FILE="python_outputs/alt3_${TIMESTAMP}_1_user_request_analyzer.json"
    if [ -f "$USER_REQUEST_FILE" ]; then
        # Try to extract the original input from the JSON
        grep -o '"input":[^,]*' "$USER_REQUEST_FILE" | sed 's/"input":"//; s/"$//' | sed 's/\\n/\n/g' >> "$RATIONALE_FILE" 2>/dev/null || echo "(Original request not preserved)" >> "$RATIONALE_FILE"
        grep -o '"input":[^,]*' "$USER_REQUEST_FILE" | sed 's/"input":"//; s/"$//' | sed 's/\\n/\n/g' >> "$RATIONALE_PYTHON_FILE" 2>/dev/null || echo "(Original request not preserved)" >> "$RATIONALE_PYTHON_FILE"
    else
        echo "(Original request not preserved in older runs)" >> "$RATIONALE_FILE"
        echo "(Original request not preserved in older runs)" >> "$RATIONALE_PYTHON_FILE"
    fi
fi
echo "" >> "$RATIONALE_FILE"
echo "" >> "$RATIONALE_PYTHON_FILE"

# Get the analyzed user requirements
USER_REQUEST_FILE="python_outputs/alt3_${TIMESTAMP}_1_user_request_analyzer_output.txt"
if [ -f "$USER_REQUEST_FILE" ]; then
    echo "📋 Analyzed Requirements:" >> "$RATIONALE_FILE"
    echo "📋 Analyzed Requirements:" >> "$RATIONALE_PYTHON_FILE"
    head -10 "$USER_REQUEST_FILE" | tail -5 >> "$RATIONALE_FILE"
    head -10 "$USER_REQUEST_FILE" | tail -5 >> "$RATIONALE_PYTHON_FILE"
    echo "" >> "$RATIONALE_FILE"
    echo "" >> "$RATIONALE_PYTHON_FILE"
fi

echo "🎨 Designer Rationale:" >> "$RATIONALE_FILE"
echo "🎨 Designer Rationale:" >> "$RATIONALE_PYTHON_FILE"
sed -n '1,/---RATIONALE-SEPARATOR---/p' "$STAGE2_FILE" | sed '/---RATIONALE-SEPARATOR---/d' | sed '/```/d' >> "$RATIONALE_FILE"
sed -n '1,/---RATIONALE-SEPARATOR---/p' "$STAGE2_FILE" | sed '/---RATIONALE-SEPARATOR---/d' | sed '/```/d' >> "$RATIONALE_PYTHON_FILE"
echo "" >> "$RATIONALE_FILE"
echo "" >> "$RATIONALE_PYTHON_FILE"

echo "🔧 Engineer Rationale:" >> "$RATIONALE_FILE"
echo "🔧 Engineer Rationale:" >> "$RATIONALE_PYTHON_FILE"
sed -n '1,/---RATIONALE-SEPARATOR---/p' "$STAGE3_FILE" | sed '/---RATIONALE-SEPARATOR---/d' | sed '/```/d' >> "$RATIONALE_FILE"
sed -n '1,/---RATIONALE-SEPARATOR---/p' "$STAGE3_FILE" | sed '/---RATIONALE-SEPARATOR---/d' | sed '/```/d' >> "$RATIONALE_PYTHON_FILE"

# Extract Figma JSON section (save to both locations)
awk '/---RATIONALE-SEPARATOR---/{flag=1; next} flag && /^```$/{exit} flag' "$STAGE3_FILE" > "$FIGMA_JSON_FILE"
awk '/---RATIONALE-SEPARATOR---/{flag=1; next} flag && /^```$/{exit} flag' "$STAGE3_FILE" > "$FIGMA_JSON_PYTHON_FILE"

echo "✅ Results saved:"
echo "   📋 Figma JSON: $FIGMA_JSON_FILE"
echo "   📋 Figma JSON: $FIGMA_JSON_PYTHON_FILE"
echo "   🧠 Rationales: $RATIONALE_FILE"
echo "   🧠 Rationales: $RATIONALE_PYTHON_FILE"
echo ""
echo "📋 Copy this JSON to your Figma plugin:"
echo ""
cat "$FIGMA_JSON_FILE"