# Python Pipeline Runner

A standalone Python implementation for testing the Instance Vibe AI pipeline without Figma.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up your Gemini API key:**
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   ```
   Or pass it directly: `--api-key your_key`

3. **Run the pipeline:**
   ```bash
   # Run all stages
   python instance.py all
   
   # Run with custom input
   python instance.py all --input "Build a expense tracking app"
   
   # Run individual stages
   python instance.py 1
   python instance.py 2
   python instance.py 3
   python instance.py 4
   python instance.py 5
   ```

## Usage Examples

### Full Pipeline
```bash
python instance.py all --input "Create a modern task management app for small teams"
```

### Individual Stages
```bash
# Stage 1: Product Manager
python instance.py 1

# Stage 2: Product Designer (uses Stage 1 output)
python instance.py 2

# Continue with remaining stages...
python instance.py 3
python instance.py 4
python instance.py 5
```

### Testing Mode (No API Key)
```bash
# Run without API key for prompt testing
python instance.py all
```

## Output Files

All outputs are saved to `./python_outputs/` directory:

- `{run_id}_{stage_num}_{stage_name}.json` - Individual stage outputs
- `{run_id}_summary.json` - Full pipeline summary

## Pipeline Stages

1. **Product Manager** - Analyzes requirements and creates PRD
2. **Product Designer** - Creates design specifications  
3. **UX Designer** - Defines user experience and flows
4. **UI Designer** - Creates visual design specifications
5. **JSON Engineer** - Generates component JSON data

## Features

- ✅ **Stage-by-stage execution** - Run individual stages or full pipeline
- ✅ **Output persistence** - All outputs saved as JSON files
- ✅ **AI integration** - Uses Gemini AI when API key provided
- ✅ **Fallback mode** - Works without API key for prompt testing
- ✅ **Real prompts** - Uses actual prompt files from the main project
- ✅ **Chain execution** - Stages automatically use previous stage outputs
- ✅ **Detailed logging** - Shows execution time, token usage, etc.

## Development Workflow

1. **Edit prompts** in `src/prompts/roles/` directory
2. **Test quickly** with `python instance.py 1` (or specific stage)
3. **Iterate rapidly** without Figma plugin overhead
4. **Validate full pipeline** with `python instance.py all`

Perfect for rapid prompt iteration and pipeline testing!