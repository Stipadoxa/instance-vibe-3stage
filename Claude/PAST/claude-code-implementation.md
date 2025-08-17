# Claude Code Implementation Plan - UXPal Prompt Fixes

## 🎯 Objective
Fix the rendering errors and implement improvements to UXPal's AI prompts to match UXPilot quality.

## 📁 Files to Modify
1. `prompts/alt1-user-request-analyzer.txt`
2. `prompts/alt2-ux-ui-designer.txt` 
3. `prompts/json-engineer.txt` (PRIORITY - has critical bugs)

---

## 🚨 TASK 1: Critical Bug Fixes in `json-engineer.txt` (DO FIRST)

### File: `prompts/json-engineer.txt`

#### Action 1.1: Fix Text Property Format
**FIND this section** (around line containing "TEXT HIERARCHY" or "native-text"):
```
Any example showing textStyle as nested object
```

**REPLACE with:**
```markdown
## TEXT HIERARCHY IMPLEMENTATION (CRITICAL)

### Native Text Properties Format:
IMPORTANT: Properties must be FLAT, not nested objects!

❌ NEVER DO THIS:
```json
{
  "type": "native-text",
  "properties": {
    "content": "Text",
    "textStyle": {  // FATAL ERROR - causes renderer crash
      "fontSize": 14,
      "fontWeight": 400
    }
  }
}
```

✅ ALWAYS DO THIS:
```json
{
  "type": "native-text",
  "properties": {
    "content": "Text",
    "fontSize": 14,        // Flat property
    "fontWeight": "400",   // String, not number
    "color": "Neutral/neutral50",  // "color" not "textColor"
    "textDecoration": "UNDERLINE"  // UPPERCASE
  }
}
```

### Text Hierarchy Rules by Content Type:

**Primary/Headlines** (product names, page titles):
- fontSize: 20-24
- fontWeight: "600" or "700"
- color: "Neutral/neutral90"

**Secondary/Body** (descriptions, details):
- fontSize: 14-16
- fontWeight: "400"
- color: "Neutral/neutral70"

**Tertiary/Captions** (metadata, timestamps, hints):
- fontSize: 12-13
- fontWeight: "400"
- color: "Neutral/neutral50"

**Links/Actions** (clickable text):
- fontSize: 14
- fontWeight: "400" or "500"
- color: "Primary/primary60"
- textDecoration: "UNDERLINE"

**Prices/Important Numbers**:
- fontSize: 20-24
- fontWeight: "700"
- color: "Primary/primary60" or "Success/success60"
```

#### Action 1.2: Fix Root Container Padding
**FIND section about** "MANDATORY JSON STRUCTURE" or root container examples

**ADD/UPDATE to ensure:**
```markdown
## ROOT CONTAINER RULES (ZERO TOLERANCE)

The root layoutContainer MUST ALWAYS have:
```json
{
  "layoutContainer": {
    "name": "Screen Name",
    "layoutMode": "VERTICAL",
    "itemSpacing": 0,      // ALWAYS 0 for root
    "paddingTop": 0,       // ALWAYS 0 for root
    "paddingBottom": 0,    // ALWAYS 0 for root
    "paddingLeft": 0,      // ALWAYS 0 for root
    "paddingRight": 0,     // ALWAYS 0 for root
    "width": 414,
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "FIXED"
  },
  "items": [
    // Content goes here with proper padding in nested containers
  ]
}
```

NEVER add padding to root. Add padding to first nested container instead.
```

#### Action 1.3: Add Validation Rules
**ADD before** "OUTPUT FORMAT" section:
```markdown
## PRE-OUTPUT VALIDATION CHECKLIST

MUST verify before outputting JSON:
- [ ] Root container has ALL paddings = 0
- [ ] Root container has itemSpacing = 0
- [ ] NO nested textStyle objects anywhere
- [ ] All fontWeight values are STRINGS ("400", not 400)
- [ ] Using "color" not "textColor" for text colors
- [ ] textDecoration is UPPERCASE ("UNDERLINE" not "underline")
- [ ] Every native-text has different styling based on hierarchy
- [ ] Component properties have no undefined values (use "" for empty)
```

---

## 📝 TASK 2: Enhance `alt1-user-request-analyzer.txt`

### File: `prompts/alt1-user-request-analyzer.txt`

#### Action 2.1: Add Implicit UX Elements
**FIND** "### Step 2: Generate Rich Content"
**ADD AFTER it:**
```markdown
### Step 2.5: Infer Implicit UX Requirements
Automatically include elements users expect but don't request:

**Universal Additions** (add to all interfaces):
- Loading states for async operations
- Empty states with guidance
- Validation messages for forms
- Timestamps for time-sensitive content
- Status indicators for processes

**E-commerce/Marketplace Additions**:
- "Verified" badge for sellers
- "X left in stock" urgency indicator
- "Free shipping" when applicable
- Product image placeholders
- Save/wishlist option

**Login/Forms Additions**:
- "Remember me" checkbox
- Social login options (Google, Apple)
- Password visibility toggle
- Input validation hints
- Terms/Privacy links

**Dashboard Additions**:
- Refresh timestamp
- Export/download option
- Period selector
- View toggle (table/chart)

**Listing/Search Additions**:
- Result count "Showing X of Y"
- Sort options
- Filter button
- Load more/pagination
- No results state
```

#### Action 2.2: Add Content Hierarchy
**MODIFY the OUTPUT FORMAT section to include:**
```json
{
  "userRequest": "{{USER_REQUEST}}",
  "content": {
    // existing content structure
  },
  "implicitElements": [
    "search_bar",
    "filter_button", 
    "empty_state",
    "loading_indicator",
    "result_count"
  ],
  "contentHierarchy": {
    "primary": ["title", "price", "main_cta"],
    "secondary": ["description", "seller_info"],
    "tertiary": ["metadata", "timestamps", "badges"]
  },
  "hasExplicitStructure": false,
  "suggestedPageType": "E-commerce"
}
```

---

## 🎨 TASK 3: Improve `alt2-ux-ui-designer.txt`

### File: `prompts/alt2-ux-ui-designer.txt`

#### Action 3.1: Add Spacing System
**FIND** "## SECTION PATTERNS"
**ADD AFTER:**
```markdown
## SPACING SYSTEM (MANDATORY)

Use consistent spacing for professional layouts:

**Spacing Scale**:
- 0px: Root container, touching elements, full-bleed
- 4px: Icon to label (very tight)
- 8px: Related items within group
- 16px: Standard padding, between groups
- 24px: Section separation
- 32px: Major section breaks

**Container Hierarchy**:
1. Root: padding=0, itemSpacing=0 (ALWAYS)
2. Main sections: padding=16px, itemSpacing=16-24px
3. Cards/groups: padding=16px, itemSpacing=8px
4. Inline items: padding=0, itemSpacing=4-8px

**Special Cases**:
- Tab bars: itemSpacing=0 (touching)
- Image galleries: itemSpacing=0 or 8px
- Button groups: itemSpacing=8px
- Form fields: itemSpacing=16px
```

#### Action 3.2: Add Typography Specification
**FIND** "DESIGN SPECIFICATION" section
**ADD to the specification format:**
```markdown
### Typography Mapping (REQUIRED)
Specify hierarchy for EVERY text element:

```json
{
  "textHierarchy": {
    "screenTitle": {
      "content": "Login to CraftMart",
      "style": "Heading/H2",
      "size": 24,
      "weight": "700"
    },
    "fieldLabel": {
      "content": "Email Address",
      "style": "Caption",
      "size": 12,
      "weight": "500"
    },
    "bodyText": {
      "content": "Description text",
      "style": "Body/Medium",
      "size": 14,
      "weight": "400"
    },
    "link": {
      "content": "Forgot Password?",
      "style": "Body/Medium",
      "size": 14,
      "weight": "400",
      "decoration": "underline"
    }
  }
}
```
```

#### Action 3.3: Add Component Selection Intelligence
**ADD after spacing system:**
```markdown
## COMPONENT SELECTION RULES

1. **Check for specialized components first**:
   - product-card for products (not generic card)
   - user-badge for user info (not just text)
   - nav-bar for navigation (not button row)

2. **Verify component capabilities**:
   - Has all needed text properties?
   - Supports required variants?
   - Can handle the content type?

3. **Fallback hierarchy**:
   - Exact-match specialized component
   - Composable components
   - Generic component + native elements
   - Pure native elements (last resort)
```

---

## 🧪 TASK 4: Create Test Validation Script

### Create new file: `test-prompt-fixes.py`

```python
#!/usr/bin/env python3
"""Test script to validate UXPal JSON output after prompt fixes"""

import json
import sys
from typing import Dict, List, Tuple

def validate_json_output(json_path: str) -> Tuple[bool, List[str], List[str]]:
    """
    Validate that generated JSON follows the fixed rules.
    Returns: (is_valid, errors, warnings)
    """
    with open(json_path, 'r') as f:
        data = json.loads(f.read())
    
    errors = []
    warnings = []
    
    # Check 1: Root container padding
    container = data.get('layoutContainer', {})
    if any([
        container.get('paddingTop', 1) != 0,
        container.get('paddingBottom', 1) != 0,
        container.get('paddingLeft', 1) != 0,
        container.get('paddingRight', 1) != 0
    ]):
        errors.append("CRITICAL: Root container must have 0 padding")
    
    if container.get('itemSpacing', 1) != 0:
        errors.append("CRITICAL: Root container must have itemSpacing=0")
    
    # Check 2: Text property format
    def check_text_properties(items, path=""):
        for i, item in enumerate(items):
            item_path = f"{path}[{i}]"
            
            if item.get('type') == 'native-text':
                props = item.get('properties', {})
                
                # Check for nested textStyle (FATAL ERROR)
                if 'textStyle' in props:
                    errors.append(f"FATAL: Nested textStyle object at {item_path}")
                
                # Check fontWeight is string
                if 'fontWeight' in props:
                    if not isinstance(props['fontWeight'], str):
                        errors.append(f"ERROR: fontWeight must be string at {item_path}")
                
                # Check for textColor (should be color)
                if 'textColor' in props:
                    warnings.append(f"WARNING: Use 'color' not 'textColor' at {item_path}")
            
            # Recurse into nested items
            if 'items' in item:
                check_text_properties(item['items'], item_path)
    
    if 'items' in data:
        check_text_properties(data['items'])
    
    # Check 3: Text hierarchy variety
    text_styles = set()
    
    def collect_text_styles(items):
        for item in items:
            if item.get('type') == 'native-text':
                props = item.get('properties', {})
                style = (
                    props.get('fontSize', 14),
                    props.get('fontWeight', '400')
                )
                text_styles.add(style)
            if 'items' in item:
                collect_text_styles(item['items'])
    
    if 'items' in data:
        collect_text_styles(data['items'])
    
    if len(text_styles) < 2:
        warnings.append(f"Low text variety: only {len(text_styles)} unique styles")
    
    # Check 4: Spacing consistency
    valid_spacing = {0, 4, 8, 16, 24, 32}
    
    def check_spacing(items, path=""):
        for i, item in enumerate(items):
            if 'itemSpacing' in item:
                spacing = item['itemSpacing']
                if spacing not in valid_spacing:
                    warnings.append(f"Non-standard spacing {spacing}px at {path}[{i}]")
            if 'items' in item:
                check_spacing(item['items'], f"{path}[{i}]")
    
    if 'items' in data:
        check_spacing(data['items'])
    
    return (len(errors) == 0, errors, warnings)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test-prompt-fixes.py <json_file>")
        sys.exit(1)
    
    is_valid, errors, warnings = validate_json_output(sys.argv[1])
    
    print("=" * 50)
    print("UXPal JSON Validation Report")
    print("=" * 50)
    
    if errors:
        print("\n❌ ERRORS (Must Fix):")
        for error in errors:
            print(f"  • {error}")
    
    if warnings:
        print("\n⚠️  WARNINGS (Should Fix):")
        for warning in warnings:
            print(f"  • {warning}")
    
    if is_valid:
        print("\n✅ JSON is valid and should render correctly!")
    else:
        print("\n❌ JSON has critical errors that will cause rendering failures!")
    
    print("\n" + "=" * 50)
    sys.exit(0 if is_valid else 1)
```

---

## 🚀 Execution Instructions for Claude Code

```bash
# Step 1: Backup existing prompts
cp prompts/alt1-user-request-analyzer.txt prompts/alt1-user-request-analyzer.backup.txt
cp prompts/alt2-ux-ui-designer.txt prompts/alt2-ux-ui-designer.backup.txt
cp prompts/json-engineer.txt prompts/json-engineer.backup.txt

# Step 2: Apply the fixes in order
# - Start with Task 1 (json-engineer.txt) - CRITICAL FIXES
# - Then Task 2 (analyzer) 
# - Then Task 3 (designer)
# - Create the test script

# Step 3: Test with the login page request
echo "Create a login screen for the marketplace app with email and password fields, a login button, and a 'forgot password' link" > test_request.txt

# Step 4: Run through pipeline and validate
python test-prompt-fixes.py figma_ready.json
```

---

## ✅ Success Criteria

After implementation, the JSON output should:
1. **No renderer crashes** - Clean rendering without errors
2. **Root container** - 0 padding on all sides
3. **Text properties** - Flat structure, no nested objects
4. **Text hierarchy** - 3+ different text styles
5. **Spacing** - Consistent use of 0, 8, 16, 24px
6. **Implicit elements** - Includes unrequested but expected UI elements

## 🎯 Priority Order

1. **FIX CRITICAL BUGS FIRST** (Task 1) - This stops the crashes
2. **Then enhance** (Tasks 2-3) - This improves quality
3. **Test thoroughly** (Task 4) - Validate everything works