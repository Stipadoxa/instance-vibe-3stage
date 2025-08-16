# UXPal Implementation Plan for Claude Code

## 📁 File Structure & Implementation Tasks

### Task 1: Update `alt1-user-request-analyzer.txt`

**File Location**: `prompts/alt1-user-request-analyzer.txt`

**Action**: Add the following sections after line containing "### Step 2: Generate Rich Content"

```markdown
### Step 2.5: Infer Implicit UX Requirements
Based on the interface type, automatically include:

**Universal Enhancements** (add even if not requested):
- Search/filter capabilities for any list >3 items
- Loading states for async operations
- Empty states with actionable guidance
- Breadcrumbs for deep navigation
- Timestamps for time-sensitive content
- Status indicators for processes

**Context-Specific Additions by Page Type**:

**E-commerce/Marketplace**:
- "Verified" badges for sellers
- "X left in stock" for urgency
- "Others are viewing" for social proof
- Recently viewed section
- Save for later functionality

**Dashboard/Analytics**:
- Time period selector
- Export/download options
- Comparison indicators (+/- change)
- Refresh timestamp
- View toggle (table/chart)

**Forms/Login**:
- Password strength indicator
- Remember me checkbox
- Social login options
- Input validation hints
- Terms of service link

**Profile/Account**:
- Edit mode toggle
- Activity status indicator
- Member since date
- Verification badges
```

**Action**: Modify the OUTPUT FORMAT section to include:

```json
{
  "userRequest": "{{USER_REQUEST}}",
  "content": {
    // existing content structure
  },
  "implicitElements": {
    "search": true,
    "filters": ["price", "rating", "category"],
    "emptyState": "No items found. Try adjusting your filters.",
    "loadingState": "Loading products...",
    "timestamps": true,
    "badges": ["verified", "sale", "popular"]
  },
  "contentHierarchy": {
    "primary": ["title", "price", "cta"],
    "secondary": ["description", "rating"],
    "tertiary": ["metadata", "timestamps"]
  },
  "hasExplicitStructure": false,
  "suggestedPageType": "E-commerce"
}
```

---

### Task 2: Update `alt2-ux-ui-designer.txt`

**File Location**: `prompts/alt2-ux-ui-designer.txt`

**Action**: Insert after "## SECTION PATTERNS" (around line 20):

```markdown
## SPACING SYSTEM (MANDATORY)
Apply consistent spacing using these values:

**Spacing Values**:
- 0px: Root container, touching elements, full-bleed
- 4px: Icon to label
- 8px: Related items in group
- 16px: Between groups, standard padding
- 24px: Section separation
- 32px: Major section breaks

**Container Rules**:
- Root: padding=0, itemSpacing=0
- Sections: padding=16, itemSpacing=16
- Cards: padding=16, itemSpacing=8
- Touching (tabs): padding=0, itemSpacing=0

## COMPONENT SELECTION INTELLIGENCE

Before selecting any component:
1. Search for exact-match specialized component
2. Check if component has all needed text properties
3. Verify variant options match requirements
4. Fall back to generic only if specialized doesn't exist

Example mappings:
- Product display → product-card (NOT generic card)
- Navigation → nav-bar or tabs (NOT buttons in row)
- User info → avatar + user-badge (NOT just text)
```

**Action**: Add to DESIGN SPECIFICATION output format:

```markdown
### Typography Specifications:
For EVERY text element, specify:
- style: "Heading/H1" | "Body/Large" | "Caption" etc.
- weight: "Bold" | "Medium" | "Regular"
- color: from design system colors
- size: explicit size if native text

Example:
"productTitle": {"style": "Heading/H3", "weight": "Bold"}
"price": {"style": "Heading/H2", "weight": "Bold", "color": "Primary"}
"description": {"style": "Body/Medium", "weight": "Regular"}
"metadata": {"style": "Caption", "weight": "Regular", "color": "Neutral/60"}
```

---

### Task 3: Update `json-engineer.txt`

**File Location**: `prompts/json-engineer.txt`

**Action**: Add after "## RENDERER CONSTRAINTS" section:

```markdown
## TEXT HIERARCHY IMPLEMENTATION (CRITICAL)

EVERY native-text MUST have distinct styling:

```json
// ❌ WRONG - All text looks the same
{
  "type": "native-text",
  "properties": {"content": "Product Name"}
},
{
  "type": "native-text", 
  "properties": {"content": "$99.99"}
}

// ✅ CORRECT - Distinct hierarchy
{
  "type": "native-text",
  "properties": {
    "content": "Product Name",
    "fontSize": 20,
    "fontWeight": "600",
    "color": "Neutral/neutral90"
  }
},
{
  "type": "native-text",
  "properties": {
    "content": "$99.99",
    "fontSize": 24,
    "fontWeight": "700",
    "color": "Primary/primary60"
  }
}
```

### Text Style Mapping Rules:
- Headlines: fontSize: 24-32, fontWeight: "600-700"
- Subheadings: fontSize: 18-20, fontWeight: "500-600"
- Body: fontSize: 14-16, fontWeight: "400"
- Captions: fontSize: 12-13, fontWeight: "400", opacity: 0.7
- Buttons: fontSize: 14-16, fontWeight: "500-600"
- Prices: fontSize: 20-24, fontWeight: "600-700"

## SPACING IMPLEMENTATION

Root container MUST have 0 padding:
```json
{
  "layoutContainer": {
    "name": "Screen",
    "layoutMode": "VERTICAL",
    "itemSpacing": 0,
    "paddingTop": 0,
    "paddingBottom": 0,
    "paddingLeft": 0,
    "paddingRight": 0,
    "width": 414
  }
}
```
```

**Action**: Add validation checklist before "## OUTPUT FORMAT":

```markdown
## PRE-OUTPUT VALIDATION CHECKLIST
Before outputting JSON, verify:
- [ ] Root container has 0 padding
- [ ] Every text has distinct fontSize/fontWeight
- [ ] Spacing uses only: 0, 4, 8, 16, 24, 32
- [ ] Component properties have no undefined values
- [ ] Text hierarchy matches designer specifications
```

---

### Task 4: Create Test Validation Script

**File**: Create new `test-improvements.py`

```python
import json
import re

def validate_json_output(json_str):
    """Validate that JSON follows new rules"""
    data = json.loads(json_str)
    
    errors = []
    warnings = []
    
    # Check root container padding
    container = data.get('layoutContainer', {})
    if any([
        container.get('paddingTop', 1) != 0,
        container.get('paddingBottom', 1) != 0,
        container.get('paddingLeft', 1) != 0,
        container.get('paddingRight', 1) != 0
    ]):
        errors.append("Root container must have 0 padding")
    
    # Check text hierarchy
    text_styles = set()
    
    def check_items(items):
        for item in items:
            if item.get('type') == 'native-text':
                props = item.get('properties', {})
                style = (
                    props.get('fontSize', 14),
                    props.get('fontWeight', '400')
                )
                text_styles.add(style)
            
            if item.get('items'):
                check_items(item['items'])
    
    check_items(data.get('items', []))
    
    if len(text_styles) < 2:
        warnings.append(f"Only {len(text_styles)} text styles found - need variety")
    
    # Check spacing values
    valid_spacing = {0, 4, 8, 16, 24, 32}
    
    def check_spacing(obj):
        spacing = obj.get('itemSpacing')
        if spacing is not None and spacing not in valid_spacing:
            warnings.append(f"Non-standard spacing: {spacing}px")
    
    # Recursively check all containers
    def traverse(obj):
        if isinstance(obj, dict):
            check_spacing(obj)
            for value in obj.values():
                traverse(value)
        elif isinstance(obj, list):
            for item in obj:
                traverse(item)
    
    traverse(data)
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'text_variety': len(text_styles)
    }

# Test with your outputs
if __name__ == "__main__":
    with open('figma_ready.json', 'r') as f:
        result = validate_json_output(f.read())
        print(json.dumps(result, indent=2))
```

---

## 🚀 Implementation Steps for Claude Code

1. **Start with Task 3** (json-engineer.txt) - Biggest visual impact
2. **Then Task 1** (analyzer) - Adds thoughtful UX elements  
3. **Then Task 2** (designer) - Ensures proper component selection
4. **Run Task 4** - Validate improvements are working

## 📝 Testing the Changes

After implementation, test with:
```
"Create a product listing page showing search results for electronics"
```

Success criteria:
- Root container has 0 padding ✓
- Different text sizes for title vs price vs metadata ✓
- Includes search bar, filters, empty state (not requested) ✓
- Consistent spacing (0, 8, 16, 24px) ✓

## ⚠️ Important Notes for Claude Code

1. **Preserve existing structure** - Don't delete existing prompt content
2. **Insert at specified locations** - Look for the marker text mentioned
3. **Test incrementally** - Update one file, test, then proceed
4. **Keep backups** - Copy original files before modifying
5. **Watch for conflicts** - Some rules may need adjustment based on your specific design system

## 🎯 What Claude Code Should Do

```bash
# 1. Backup existing prompts
cp prompts/alt1-user-request-analyzer.txt prompts/alt1-user-request-analyzer.backup.txt
cp prompts/alt2-ux-ui-designer.txt prompts/alt2-ux-ui-designer.backup.txt
cp prompts/json-engineer.txt prompts/json-engineer.backup.txt

# 2. Update each file with the specified additions
# 3. Create the validation script
# 4. Run a test to verify improvements
```