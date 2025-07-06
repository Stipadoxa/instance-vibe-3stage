# Instance Vibe - 3-Stage Pipeline

A streamlined 3-stage AI pipeline for generating Figma UI components with proper autolayout support.

## Overview

This is the 3-stage version of Instance Vibe that simplifies the UI generation process into three focused stages:

1. **User Request Analyzer** - Analyzes user requirements and extracts design intent
2. **UX UI Designer** - Creates detailed component specifications with design system integration
3. **JSON Engineer** - Generates production-ready Figma plugin JSON with proper autolayout structure

## Key Features

- ✅ **Proper Autolayout Rendering** - Fixed JSON structure ensures autolayouts (not frames) in Figma
- ✅ **Design System Integration** - Leverages component scan data for accurate component mapping
- ✅ **Streamlined Pipeline** - Reduced from 5 stages to 3 for faster iteration
- ✅ **Python Backend** - Standalone Python implementation for testing without Figma dependency

## Recent Fixes

### Autolayout Structure Fix (2025-01-06)
Fixed critical issue where generated JSON created frames instead of autolayouts in Figma:

**Problem**: Components appeared as "pile of components" instead of proper layout flows
**Solution**: Corrected JSON root structure to split `layoutContainer` properties from `items` array
**Result**: Proper vertical/horizontal autolayout flows in Figma plugin

## Usage

### Run 3-Stage Pipeline
```bash
python3 instance.py alt3 --input "your design request"
```

### Example
```bash
python3 instance.py alt3 --input "create a search results page with horizontal row of 3 filters and a list of 3 product cards results"
```

## Project Structure

```
├── instance.py              # Main 3-stage pipeline runner
├── src/prompts/roles/       # AI role prompts
│   ├── alt1-user-request-analyzer.txt
│   ├── alt2-ux-ui-designer.txt
│   └── 5 json-engineer.txt  # Shared with 5-stage pipeline
├── python_outputs/          # Pipeline execution outputs
├── src/core/               # Figma plugin core (for testing)
└── requirements.txt        # Python dependencies
```

## Requirements

- Python 3.8+
- Gemini AI API key (set in `.env` file)
- Node.js (for Figma plugin testing)

## Environment Setup

1. Create `.env` file:
```
GEMINI_API_KEY=your_api_key_here
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Output Structure

The pipeline generates properly structured JSON for Figma autolayouts:

```json
{
  "layoutContainer": {
    "name": "Screen Name",
    "layoutMode": "VERTICAL",
    "itemSpacing": 16,
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "FIXED"
  },
  "items": [
    // Components at root level (not inside layoutContainer)
  ]
}
```

This structure ensures proper autolayout rendering in the Figma plugin.
EOF < /dev/null
