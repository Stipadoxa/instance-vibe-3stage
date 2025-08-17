# QA Loop Implementation Plan for UXPal Pipeline

## Overview
✅ **COMPLETED**: Added QA validation stage (Stage 2.5) between UX/UI Designer and JSON Engineer with design system compliance validation, configurable iteration loops, detailed change logging, and sizing properties cheat sheet.

**Key Design Decision**: The QA module handles separation of rationale from JSON in designer output. The QA prompt receives clean JSON only.

---

## File Structure to Create

```
/Users/stipa/UXPal/
├── scripts/
│   └── design_qa.py              # New QA module
├── src/prompts/roles/
│   └── alt2-5-design-qa.txt      # New QA prompt
└── instance.py                   # Modify to integrate QA
```

---

## Step-by-Step Implementation

### Step 1: Create the QA Prompt File ✅ DONE
**File**: `src/prompts/roles/alt2-5-design-qa.txt`

```markdown
# Design System QA Validator

You are a technical QA validator who checks if designs correctly use the design system components.
You DO NOT redesign or make creative decisions. You ONLY fix technical compliance issues.

## YOUR ONLY JOB
Fix technical issues in the JSON while preserving all design decisions.

## VALIDATION CHECKLIST

### Component Validation
□ Does every componentNodeId exist in DESIGN_SYSTEM_DATA? (Check: ID format should be "number:number" like "10:5620")
□ Does every component have ALL required variants from its schema?
□ Do all variant values match exactly with variantDetails options? (case-sensitive)
□ Do all text properties use the exact property names from textLayers?
□ Are visibilityOverrides added for empty text layers?

### Text Element Validation  
□ Does every native-text have flexFillRequired: true?
□ Are there NO width properties on any native-text elements?
□ Do all native-text elements use valid textStyle names from design system?

### Layout Structure Validation
□ Is the bottom navigation the LAST item in the root container's items array?
□ Does the content container (middle item) have layoutGrow: 1?
□ Does the root container have all padding values set to 0?
□ Is the top navigation the FIRST item in the root container's items array?

### Property Name Validation
□ Are all component IDs using "componentNodeId" (not "id" or "componentId")?
□ Are color properties using correct names? (backgroundColor, color, borderColor)
□ Are text properties inside a "properties" object for native elements?

## INPUT DATA

### Design System Data
{{DESIGN_SYSTEM_DATA}}

### Current JSON to Validate
{{CURRENT_JSON}}

### Previous Fix Attempts
{{FIX_HISTORY}}

## OUTPUT REQUIREMENTS

You must output in this EXACT format:

---ISSUES-FOUND---
[List each issue found, one per line. If no issues, write "NONE"]

---FIXED-JSON---
[Output the complete fixed JSON here]

---CHANGES-MADE---
[List each change made, one per line. If no changes, write "NONE"]
```

---

### Step 2: Create the QA Module ✅ DONE
**File**: `scripts/design_qa.py`

```python
import json
import os
from pathlib import Path
from datetime import datetime
import re

class DesignQA:
    def __init__(self, gemini_api_key):
        """Initialize with Gemini API key."""
        self.api_key = gemini_api_key
        # Import here to avoid issues if not installed
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def load_design_system_data(self):
        """Load the newest design system data file."""
        design_system_dir = Path("design-system")
        files = list(design_system_dir.glob("design-system-raw-data-*.json"))
        
        if not files:
            raise FileNotFoundError("No design system files found")
            
        # Sort by timestamp in filename
        newest_file = max(files, key=lambda f: f.stem.split('-data-')[1])
        
        with open(newest_file, 'r') as f:
            return json.load(f)
    
    def load_qa_prompt(self):
        """Load the QA prompt template."""
        prompt_path = Path("src/prompts/roles/alt2-5-design-qa.txt")
        with open(prompt_path, 'r') as f:
            return f.read()
    
    def extract_json_from_designer_output(self, designer_output):
        """
        Extract JSON from designer output that contains rationale + separator + JSON.
        
        Handles formats like:
        - "RATIONALE... ---RATIONALE-SEPARATOR--- {json}"
        - "RATIONALE... ## DESIGN SPECIFICATION {json}"
        - "RATIONALE... ```json {json} ```"
        - Already parsed JSON objects
        """
        if isinstance(designer_output, dict):
            # Already parsed JSON
            return designer_output
            
        if isinstance(designer_output, str):
            # Look for separator patterns
            separators = [
                "---RATIONALE-SEPARATOR---",
                "---JSON-START---",
                "## DESIGN SPECIFICATION",
                "```json"
            ]
            
            json_str = designer_output
            for separator in separators:
                if separator in designer_output:
                    # Take everything after the separator
                    parts = designer_output.split(separator)
                    json_str = parts[-1] if len(parts) > 1 else parts[0]
                    break
            
            # Clean up markdown if present
            json_str = json_str.strip()
            if "```" in json_str:
                # Extract from markdown code block
                match = re.search(r'```(?:json)?\n(.*?)\n```', json_str, re.DOTALL)
                if match:
                    json_str = match.group(1)
            
            # Parse JSON
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse JSON from designer output: {e}")
                # Try one more time with just the curly braces content
                match = re.search(r'\{.*\}', json_str, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                raise
        
        return designer_output
    
    def parse_qa_response(self, response_text):
        """Parse the QA response into components."""
        result = {
            'issues': [],
            'fixed_json': None,
            'changes': []
        }
        
        # Split by section markers
        sections = response_text.split('---')
        
        for i, section in enumerate(sections):
            if 'ISSUES-FOUND' in section:
                # Next section has issues
                issues_text = sections[i+1].strip()
                if issues_text != "NONE":
                    result['issues'] = [line.strip() for line in issues_text.split('\n') if line.strip()]
                    
            elif 'FIXED-JSON' in section:
                # Next section has JSON
                json_text = sections[i+1].strip()
                try:
                    result['fixed_json'] = json.loads(json_text)
                except json.JSONDecodeError:
                    # Try to extract JSON from markdown blocks
                    match = re.search(r'```json\n(.*)\n```', json_text, re.DOTALL)
                    if match:
                        result['fixed_json'] = json.loads(match.group(1))
                        
            elif 'CHANGES-MADE' in section:
                # Next section has changes
                changes_text = sections[i+1].strip()
                if changes_text != "NONE":
                    result['changes'] = [line.strip() for line in changes_text.split('\n') if line.strip()]
        
        return result
    
    def extract_json_from_designer_output(self, designer_output):
        """Extract JSON from designer output that contains rationale + separator + JSON."""
        if isinstance(designer_output, dict):
            # Already parsed JSON
            return designer_output
            
        if isinstance(designer_output, str):
            # Look for separator patterns
            separators = [
                "---RATIONALE-SEPARATOR---",
                "---JSON-START---",
                "## DESIGN SPECIFICATION",
                "```json"
            ]
            
            json_str = designer_output
            for separator in separators:
                if separator in designer_output:
                    # Take everything after the separator
                    parts = designer_output.split(separator)
                    json_str = parts[-1] if len(parts) > 1 else parts[0]
                    break
            
            # Clean up markdown if present
            json_str = json_str.strip()
            if "```" in json_str:
                # Extract from markdown code block
                match = re.search(r'```(?:json)?\n(.*?)\n```', json_str, re.DOTALL)
                if match:
                    json_str = match.group(1)
            
            # Parse JSON
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse JSON from designer output: {e}")
                # Try one more time with just the curly braces content
                match = re.search(r'\{.*\}', json_str, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                raise
        
        return designer_output
    
    def run_qa_iteration(self, current_json, fix_history=""):
        """Run a single QA iteration."""
        # Load prompt and data
        prompt_template = self.load_qa_prompt()
        design_system_data = self.load_design_system_data()
        
        # Fill in the prompt
        prompt = prompt_template.replace(
            "{{DESIGN_SYSTEM_DATA}}", 
            json.dumps(design_system_data, indent=2)
        ).replace(
            "{{CURRENT_JSON}}", 
            json.dumps(current_json, indent=2)
        ).replace(
            "{{FIX_HISTORY}}", 
            fix_history if fix_history else "No previous attempts."
        )
        
        # Call Gemini
        response = self.model.generate_content(prompt)
        
        # Parse response
        return self.parse_qa_response(response.text)
    
    def run_qa_loop(self, designer_output_json, max_iterations=3):
        """Run the QA loop with configurable iterations."""
        # Extract JSON from designer output (handles rationale + separator + JSON format)
        current_json = self.extract_json_from_designer_output(designer_output_json)
        history = []
        
        print(f"\n{'='*50}")
        print(f"Starting QA Validation (max {max_iterations} iterations)")
        print(f"{'='*50}")
        
        for iteration in range(max_iterations):
            print(f"\n📋 QA Iteration {iteration + 1}/{max_iterations}")
            
            # Build history string for prompt
            history_text = ""
            if history:
                history_text = "## Previous Attempts:\n"
                for h in history:
                    history_text += f"\n**Iteration {h['iteration']}:**\n"
                    history_text += f"Issues: {', '.join(h['issues']) if h['issues'] else 'None'}\n"
                    history_text += f"Changes: {', '.join(h['changes']) if h['changes'] else 'None'}\n"
            
            # Run QA check
            result = self.run_qa_iteration(current_json, history_text)
            
            # Check if issues found
            if not result['issues']:
                print(f"✅ No issues found! QA passed after {iteration + 1} iteration(s)")
                break
            
            print(f"❌ Found {len(result['issues'])} issue(s):")
            for issue in result['issues']:
                print(f"   - {issue}")
            
            # Update JSON if fixes were made
            if result['fixed_json']:
                current_json = result['fixed_json']
                print(f"✏️  Applied {len(result['changes'])} fix(es)")
            
            # Add to history
            history.append({
                'iteration': iteration + 1,
                'issues': result['issues'],
                'changes': result['changes']
            })
            
            # Check if we're stuck (same issues repeating)
            if len(history) >= 2:
                if history[-1]['issues'] == history[-2]['issues']:
                    print("⚠️  Same issues repeating, stopping QA loop")
                    break
        
        print(f"\n{'='*50}")
        print(f"QA Validation Complete")
        print(f"{'='*50}\n")
        
        return current_json, history
```

---

### Step 3: Create Integration Script ✅ DONE
**File**: `scripts/run_qa.py`

```python
#!/usr/bin/env python3
"""
Standalone QA runner for testing the QA loop independently.
Usage: python3 scripts/run_qa.py <timestamp> [--iterations N]
"""

import sys
import json
import argparse
from pathlib import Path
import os

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.design_qa import DesignQA

def main():
    parser = argparse.ArgumentParser(description='Run QA validation on designer output')
    parser.add_argument('timestamp', help='Timestamp of the design to validate')
    parser.add_argument('--iterations', type=int, default=3, help='Max QA iterations (default: 3)')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    # Load designer output
    designer_file = Path(f"python_outputs/alt3_{args.timestamp}_2_ux_ui_designer.json")
    if not designer_file.exists():
        print(f"❌ Designer output not found: {designer_file}")
        sys.exit(1)
    
    with open(designer_file, 'r') as f:
        designer_data = json.load(f)
        # Pass the raw AI response string - QA module will extract JSON
        designer_output = designer_data.get('ai_response', '')
    
    # Also try the output text file if needed
    if not designer_output:
        text_file = Path(f"python_outputs/alt3_{args.timestamp}_2_ux_ui_designer_output.txt")
        if text_file.exists():
            with open(text_file, 'r') as f:
                designer_output = f.read()
    
    # Initialize QA
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable not set")
        sys.exit(1)
    
    qa = DesignQA(api_key)
    
    # Run QA loop
    fixed_json, history = qa.run_qa_loop(designer_output, max_iterations=args.iterations)
    
    # Save outputs
    output_dir = Path("python_outputs")
    
    # Save QA result
    qa_output_file = output_dir / f"alt3_{args.timestamp}_2_5_qa_validated.json"
    with open(qa_output_file, 'w') as f:
        json.dump(fixed_json, f, indent=2)
    print(f"💾 Saved QA output to {qa_output_file}")
    
    # Save QA history
    history_file = output_dir / f"alt3_{args.timestamp}_2_5_qa_history.json"
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)
    print(f"📝 Saved QA history to {history_file}")
    
    if args.verbose and history:
        print("\n📋 QA History Summary:")
        for h in history:
            print(f"  Iteration {h['iteration']}: {len(h['issues'])} issues → {len(h['changes'])} fixes")

if __name__ == "__main__":
    main()
```

---

### Step 4: Modify instance.py Integration ✅ DONE
**Location**: Add after Stage 2 (UX/UI Designer) completes, around line 650

```python
# Add this import at the top of instance.py
from scripts.design_qa import DesignQA

# Add this configuration near other configs (around line 50)
QA_CONFIG = {
    'enabled': True,  # Set to False to skip QA
    'max_iterations': 3,  # Configurable iteration count
}

# Add this after Stage 2 completes (around line 650)
if QA_CONFIG['enabled'] and stage_num >= 2:
    print(f"\n{'='*50}")
    print(f"Stage 2.5: Design QA Validation")
    print(f"{'='*50}")
    
    # Initialize QA
    qa = DesignQA(gemini_api_key)
    
    # Get designer output from previous stage (raw string with rationale)
    designer_output = stages[1]['ai_response']  # This is the full output with rationale
    
    # Run QA loop - it will extract JSON internally
    validated_json, qa_history = qa.run_qa_loop(
        designer_output, 
        max_iterations=QA_CONFIG['max_iterations']
    )
    
    # Save QA outputs
    qa_output = {
        'stage': 'Design QA',
        'timestamp': timestamp,
        'validated_json': validated_json,
        'history': qa_history,
        'iterations_used': len(qa_history)
    }
    
    # Save to file
    qa_file = output_dir / f"alt3_{timestamp}_2_5_qa_validated.json"
    with open(qa_file, 'w') as f:
        json.dump(qa_output, f, indent=2)
    
    # CRITICAL: Format the validated JSON for JSON Engineer
    # JSON Engineer expects designer format with separator
    formatted_for_engineer = f"""# QA VALIDATED DESIGN

Design has been validated and corrected through {len(qa_history)} QA iteration(s).

Issues fixed:
{chr(10).join(['- ' + issue for h in qa_history for issue in h.get('issues', [])])}

---RATIONALE-SEPARATOR---

{json.dumps(validated_json, indent=2)}
"""
    
    # Update the designer output for next stage
    stages[1]['ai_response'] = formatted_for_engineer
    
    print(f"✅ QA Validation complete: {len(qa_history)} iteration(s) used")
```

---

## Testing Plan ✅ COMPLETED

### 1. Test Standalone First ✅ SUCCESSFUL
```bash
# Set API key
export GEMINI_API_KEY=your_key_here

# Run on existing designer output
python3 scripts/run_qa.py 2025-08-16T10-30-00 --iterations 3 --verbose
```

### 2. Test with Different Iteration Counts ✅ SUCCESSFUL
```bash
# Single pass
python3 scripts/run_qa.py 2025-08-16T10-30-00 --iterations 1

# Five passes for thorough validation
python3 scripts/run_qa.py 2025-08-16T10-30-00 --iterations 5
```

### 3. Integrate into Main Pipeline ✅ SUCCESSFUL
```bash
# Run full pipeline with QA enabled
python3 instance.py alt3
```

---

## Configuration Options

### In instance.py:
```python
QA_CONFIG = {
    'enabled': True,           # Enable/disable QA stage
    'max_iterations': 3,        # Max attempts (1-5 recommended)
    'stop_on_no_issues': True,  # Stop early if no issues found
    'stop_on_repeat': True,     # Stop if same issues repeat
}
```

### Environment Variables:
```bash
export GEMINI_API_KEY=your_key
export QA_MAX_ITERATIONS=3  # Optional override
```

---

## Format Compatibility Note

### Critical Integration Requirement
The JSON Engineer expects input in the designer format with a separator. The QA module outputs pure JSON. The integration layer (instance.py) handles this by:

1. **QA receives**: Designer output with rationale → extracts JSON
2. **QA processes**: Pure JSON validation and fixes
3. **QA returns**: Clean validated JSON
4. **Integration formats**: Wraps JSON back in expected format for JSON Engineer
5. **Engineer receives**: Formatted string with `---RATIONALE-SEPARATOR---`

This ensures both stages work without modification while maintaining compatibility.

---

## Expanding the Checklist

When new issues are discovered, add them to the QA prompt (`alt2-5-design-qa.txt`) in the VALIDATION CHECKLIST section:

```markdown
### New Category Name
□ Is [specific thing to check] correct? (Check: [what to look for])
□ Does [element] have [required property]?
```

Keep all checks in yes/no format for clarity.