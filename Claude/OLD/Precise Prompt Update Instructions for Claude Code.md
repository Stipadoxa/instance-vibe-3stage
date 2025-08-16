Precise Prompt Update Instructions for Claude Code
File 1: Update src/prompts/roles/5 json-engineer.txt
Location 1: After line containing "## RENDERER CONSTRAINTS - READ FIRST"
ADD this new section immediately after the RENDERER CONSTRAINTS section:
## CRITICAL TEXT WIDTH HANDLING - TOP PRIORITY RULE

### MANDATORY: Every native-text MUST have these exact properties:
```json
{
  "type": "native-text",
  "properties": { "content": "Text content here" },
  "_useFlexFill": true,
  "_parentLayout": "VERTICAL"  // or "HORIZONTAL" based on parent
}
NEVER include these in native-text:

"_constraintWidth": 343  ❌ DELETE if present
Any width calculations ❌ DELETE if present
Any explicit width values ❌ DELETE if present

This is THE MOST IMPORTANT RULE for native-text elements.

### Location 2: Find the section starting with "### Algorithm 2: Native Element Property Removal"
**REPLACE the entire Algorithm 2 section with:**

```python
### Algorithm 2: Native Element Property Removal & Text Flex-Fill Enforcement
```python
FORBIDDEN_NATIVE_PROPS = [
    "horizontalSizing", "layoutAlign", "layoutGrow", 
    "items", "layoutMode", "primaryAxisSizingMode", 
    "counterAxisSizingMode", "layoutWrap"
]

for each element in designer_output:
    if element["type"].startswith("native-"):
        # Remove forbidden properties
        for prop in FORBIDDEN_NATIVE_PROPS:
            if prop in element:
                delete element[prop]
        
        # SPECIAL HANDLING FOR native-text
        if element["type"] == "native-text":
            # FORCE flex-fill metadata
            element["_useFlexFill"] = true
            element["_parentLayout"] = parent_container["layoutMode"]
            
            # DELETE any width constraints if present
            if "_constraintWidth" in element:
                delete element["_constraintWidth"]
            if "width" in element or element.properties:
                delete element["width"] or element.properties["width"]

### Location 3: Find the section "### Native Element Technical Requirements"
**REPLACE the entire native-text part with:**

```json
### Native Element Technical Requirements
Every native element MUST:
```json
{
  "type": "native-[text|rectangle|circle]",
  "properties": {
    // For native-text (UPDATED - FLEX-FILL ONLY):
    "content": "string",
    "textStyle": "string", 
    "fontSize": number,
    "fontWeight": "string",
    "color": "string",
    "alignment": "string"
  },
  
  // MANDATORY for ALL native-text (NO EXCEPTIONS):
  "_useFlexFill": true,           // ALWAYS true for text
  "_parentLayout": "VERTICAL",     // or "HORIZONTAL" from parent
  
  // NEVER ADD THESE TO native-text:
  // ❌ "_constraintWidth": number  // DELETE if present
  // ❌ "width": number              // DELETE if present

### Location 4: Find "### Pre-Output Validation Checklist"
**ADD these items at the TOP of the checklist:**

✅ EVERY native-text has "_useFlexFill": true (NO EXCEPTIONS)
✅ EVERY native-text has "_parentLayout" matching its container
✅ NO native-text has "_constraintWidth" property
✅ NO native-text has "width" in properties


---

## File 2: Update `src/prompts/roles/alt2-ux-ui-designer.txt`

### Location 1: Find section "**Native Text Properties (use design system styles):**"
**ADD immediately after that section:**
CRITICAL: Native Text Width Specification:
When creating ANY native-text element, ALWAYS structure it as:
json{
  "type": "native-text",
  "flexFillRequired": true,  // SIGNAL to JSON Engineer
  "properties": {
    "content": "Your text content",
    "textStyle": "Body/Large"
  }
}
NEVER specify width, constraintWidth, or any width-related properties for native-text.
The "flexFillRequired": true signals the JSON Engineer to use flex-fill behavior.

### Location 2: Find "## 📤 OUTPUT REQUIREMENTS"
**ADD a new subsection right after that heading:**
TEXT ELEMENT REQUIREMENTS (MANDATORY)
Every native-text in your output MUST include:

"flexFillRequired": true property at the root level
NO width specifications
NO constraint specifications
Just content and style properties

Example:
json{
  "type": "native-text",
  "flexFillRequired": true,  // ALWAYS include this
  "properties": {
    "content": "Profile Settings",
    "textStyle": "Headline/Medium"
  }
}

### Location 3: Find the very end of the file, before the last line
**ADD this final reminder:**
FINAL CHECK BEFORE OUTPUT:
□ Every native-text element has "flexFillRequired": true
□ No native-text elements have width properties
□ All native-text elements use proper textStyle from design system

---

## File 3: Create validation script (OPTIONAL but recommended)

**CREATE NEW FILE:** `scripts/validate_text_metadata.py`

```python
#!/usr/bin/env python3
"""
Validates that all native-text elements have proper flex-fill metadata.
Run after JSON Engineer stage to verify compliance.
"""

import json
import sys
from pathlib import Path

def validate_text_elements(json_file):
    """Check all native-text elements for proper metadata."""
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    errors = []
    
    def check_element(element, path="root"):
        if element.get("type") == "native-text":
            # Check for required metadata
            if not element.get("_useFlexFill"):
                errors.append(f"{path}: Missing _useFlexFill: true")
            if not element.get("_parentLayout"):
                errors.append(f"{path}: Missing _parentLayout")
            if "_constraintWidth" in element:
                errors.append(f"{path}: Has forbidden _constraintWidth")
        
        # Recurse into items
        if "items" in element:
            for i, item in enumerate(element["items"]):
                check_element(item, f"{path}.items[{i}]")
    
    check_element(data)
    
    if errors:
        print("❌ Text validation FAILED:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print("✅ All native-text elements have proper flex-fill metadata")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_text_metadata.py <json_file>")
        sys.exit(1)
    
    json_file = Path(sys.argv[1])
    if not json_file.exists():
        print(f"Error: {json_file} not found")
        sys.exit(1)
    
    success = validate_text_elements(json_file)
    sys.exit(0 if success else 1)

Summary for Claude Code:

Update JSON Engineer prompt (src/prompts/roles/5 json-engineer.txt):

Add new CRITICAL TEXT WIDTH section after RENDERER CONSTRAINTS
Replace Algorithm 2 with enhanced version
Update Native Element Technical Requirements section
Add validation items to Pre-Output Checklist


Update Designer prompt (src/prompts/roles/alt2-ux-ui-designer.txt):

Add flexFillRequired specification after Native Text Properties section
Add TEXT ELEMENT REQUIREMENTS subsection after OUTPUT REQUIREMENTS
Add FINAL CHECK at the very end


Optional: Create validation script to verify AI compliance

These changes make flex-fill THE primary rule for text, not a buried detail. The AI will see it multiple times and in prominent positions.
