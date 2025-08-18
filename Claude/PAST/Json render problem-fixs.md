Components Not in Design System
1. Rating Component (635:4130) - Used in Version 2
json{
  "componentNodeId": "635:4130",
  "variants": {"Style": "Filled"},
  "properties": {"rating": 4}
}
Problem: This ID exists in the design system but it's an icon/star_rate component, NOT a rating component with a rating property. The design system shows it only has a Style variant (Filled/Outlined), no rating functionality.
2. Non-existent Icon References

Version 1: "iconSwaps": {"leading-icon": "arrow"} - Should be a component ID, not a string
Version 2: "iconSwaps": {"leading-icon": "arrow-left"} - Invalid format

Property Mismatches
1. Image Gallery Component (10:7816)
The component exists but the property structure is wrong across all versions:
Design System expects: The component has variants for Type: ["1 image", "2+ images"] but doesn't document an images property structure.
Your JSONs provide:

Version 1: "images": ["imageUrl1", "imageUrl2", ...]
Version 2: "images": [{"imageUrl": "image1.jpg"}, ...]
Version 3: "imageUrl": "[Image URL 4]" (completely wrong property name)

2. Avatar Component (10:7798)
Design System: Has variants Type: ["Icon", "Photo"]
Your JSONs: Correctly use the variant but the imageUrl property handling seems inconsistent
3. Bottom Navigation (10:4724)
Version 2 attempts complex property overrides that don't match the design system:
json"properties": {
  "I10:4726;10:4683;10:4629": "Home",  // These complex paths aren't documented
  "I10:4726;10:4684;10:4605": "Search"
}
Text Style Issues
1. Inconsistent Style References

Version 1: "textStyle": "Headline" - Incomplete path
Version 2: "textStyle": "Headline/Large" - Correct format but not verified in design system
Version 3: Uses correct format

2. Color Property Naming

Version 1: "color": "Neutral/neutral90"
Version 2: "textColor": "Neutral/neutral50"
Version 3: Missing color properties entirely

The design system uses specific color IDs, but the property name inconsistency (color vs textColor) suggests the pipeline doesn't know which to use.
Components That Don't Render
1. Heart/Flag Icons (Version 1)

635:4744 - This is icon/bookmark in the design system, not a heart
635:4533 - This is icon/flag in the design system

These are being used incorrectly, possibly expecting different functionality.
2. Visibility Overrides
All versions use visibilityOverrides with node IDs, but it's unclear if these IDs match the actual component structure:
json"visibilityOverrides": {
  "10:5622": true,
  "10:5632": false
}
Root Cause Analysis
The pipeline has several fundamental issues:

Component Schema Validation: The pipeline selects components by ID but doesn't validate that the properties it's sending match what the component expects.
Icon Handling: The pipeline treats icons as swappable strings rather than component references.
Property Structure Guessing: For complex components like image galleries, the pipeline is guessing at property structures rather than using documented schemas.
Text Style Resolution: Inconsistent handling of text styles suggests the pipeline doesn't have a clear mapping between design intent and actual style names.
Complex Property Paths: Version 2's attempt to use deep property paths (like "I10:4726;10:4683;10:4629") suggests it's trying to modify nested component instances without understanding the proper API.

Recommendations

Validate Component Schemas: Before using a component, verify its expected properties match what you're sending
Fix Image Gallery: Research the actual property structure for 10:7816
Standardize Property Names: Use consistent naming (textColor not color)
Icon References: Use proper component IDs for icon swaps, not string names
Remove Complex Paths: Simplify property references to direct properties only

The core issue is that the pipeline is making assumptions about component APIs rather than strictly following the design system's documented schemas.
1. Stage 2: UX/UI Designer (src/prompts/roles/alt2-ux-ui-designer.txt)
This is where MOST fixes are needed since it's responsible for component selection and property assignment:
Critical Changes Needed:
yamlComponent Property Validation:
- ADD: Validation logic to check component schemas before use
- FIX: Image gallery (10:7816) property structure
- FIX: Rating component usage (use actual star components, not 635:4130)
- FIX: Icon swap format (use component IDs, not strings like "arrow")

Text Styling:
- STANDARDIZE: Always use "textColor" not "color" for native-text
- VERIFY: Text style paths match design system exactly

Property Assignment:
- REMOVE: Complex property paths like "I10:4726;10:4683;10:4629"
- ADD: Proper fallback when components don't support expected properties
Specific Prompt Updates Needed:
The prompt should include:
textCRITICAL COMPONENT RULES:
1. For image galleries (10:7816): [Document correct property structure]
2. For ratings: Use individual star components (635:4759), NOT 635:4130
3. For icon swaps: Use format {"iconName": "componentId"} not string values
4. For text colors: ALWAYS use "textColor" property, never "color"
5. NEVER use deep property paths with "I" prefixes
2. Stage 3: JSON Engineer (src/prompts/roles/5 json-engineer.txt)
Secondary fixes for technical validation:
Changes Needed:
yamlProperty Cleanup:
- ADD: Validation to catch and fix "color" â†’ "textColor" 
- ADD: Detection for invalid icon swap formats
- REMOVE: Any remaining complex property paths
- ADD: Warning system for unrecognized component properties
Add to Technical Fix Algorithms:
python# Algorithm 4: Component Property Validation
for each component in designer_output:
    if component["type"] == "component":
        # Verify componentNodeId exists in design system
        if not validate_component_exists(component["componentNodeId"]):
            log_error(f"Component {componentNodeId} not in design system")
        
        # Fix text color properties
        if "color" in component["properties"]:
            component["properties"]["textColor"] = component["properties"].pop("color")
        
        # Validate icon swaps are component IDs
        if "iconSwaps" in component:
            for icon_name, icon_value in component["iconSwaps"].items():
                if not icon_value.startswith(("10:", "635:", "24:", "147:", "423:")):
                    log_error(f"Invalid icon swap: {icon_value}")
3. Design System Data Loader (instance.py lines ~500-520)
Minor enhancement for better validation:
Changes Needed:
pythondef load_design_system_data():
    # ... existing code ...
    
    # ADD: Build component validation index
    component_index = {}
    for component in design_system_data["components"]:
        component_index[component["id"]] = {
            "variants": component.get("variantDetails", {}),
            "properties": component.get("textLayers", []),
            "type": component.get("suggestedType", "unknown")
        }
    
    # ADD: Build color style index
    color_index = {}
    for category, colors in design_system_data["colorStyles"].items():
        for color in colors:
            color_index[color["name"]] = color["colorInfo"]
    
    return design_system_data, component_index, color_index
4. Stage 1: User Request Analyzer (src/prompts/roles/alt1-user-request-analyzer.txt)
Minor adjustments for clearer specifications:
Changes Needed:
yamlOutput Specifications:
- ADD: Explicit note about rating displays (use stars, not numbers)
- ADD: Clear image gallery requirements (multiple images = gallery component)
- CLARIFY: Icon requirements (functional icons vs decorative)
5. Stage 4: Design Reviewer (scripts/design_reviewer.py)
Already correctly configured to work with validated JSON, but could add:
Optional Enhancement:
pythondef review_design(design_json):
    # ADD: Component validation warnings
    warnings = []
    for item in traverse_json(design_json):
        if item.get("type") == "component":
            if not validate_component_in_design_system(item["componentNodeId"]):
                warnings.append(f"Component {item['componentNodeId']} may not exist")
    
    if warnings:
        print("Component Validation Warnings:", warnings)
Priority Order for Implementation:

FIRST: Fix Stage 2 (UX/UI Designer) prompt - This is where 80% of issues originate
SECOND: Update Stage 3 (JSON Engineer) validation algorithms
THIRD: Enhance design system data loader for validation
OPTIONAL: Add validation to Design Reviewer

Quick Fix vs Full Solution:
Quick Fix (1 hour):

Update Stage 2 prompt with correct component usage rules
Add simple validation in Stage 3

Full Solution (4-6 hours):

Complete validation system in data loader
Comprehensive prompt updates with examples
Add component schema validator module
Test with multiple scenarios

The key insight is that Stage 2 (UX/UI Designer) is making incorrect assumptions about component APIs, so fixing the prompt there will solve most issues. Stage 3 can catch remaining problems, but ideally Stage 2 should output correct JSON from the start.RetryClaude does not have the ability to run the code it generates yet.what are Technical Fix AlgorithmsEditLooking at the UXPal documentation, Technical Fix Algorithms are specific code-like rules in Stage 3: JSON Engineer that automatically fix common technical issues in the JSON. They're documented in the prompt file src/prompts/roles/5 json-engineer.txt.
What They Are:
These are pseudo-code instructions that tell the AI how to fix specific technical problems. The JSON Engineer stage uses these algorithms to ensure the JSON is technically correct for Figma's API.
Current Technical Fix Algorithms:
Algorithm 1: Container Sizing Auto-Complete
pythonfor each container in designer_output:
    if missing("horizontalSizing"):
        container["horizontalSizing"] = "FILL"
    
    if missing("primaryAxisSizingMode"):
        if container["layoutMode"] == "VERTICAL":
            container["primaryAxisSizingMode"] = "AUTO"  # Height hugs content
    
    if missing("counterAxisSizingMode"):
        if container["layoutMode"] == "VERTICAL":
            container["counterAxisSizingMode"] = "FIXED"  # Width fills
    
    if container["horizontalSizing"] == "FILL" and missing("layoutAlign"):
        container["layoutAlign"] = "STRETCH"
Purpose: Ensures all containers have proper sizing properties so they don't collapse or break in Figma.
Algorithm 2: Native Element Property Removal
pythonFORBIDDEN_NATIVE_PROPS = [
    "horizontalSizing", "layoutAlign", "layoutGrow", 
    "items", "layoutMode", "primaryAxisSizingMode", 
    "counterAxisSizingMode", "layoutWrap"
]

for each element where type.startswith("native-"):
    remove all FORBIDDEN_NATIVE_PROPS
    wrap_in_container_if_full_width_intended(element)
Purpose: Native elements (text, rectangles, circles) can't have layout properties. This removes them to prevent errors.
Algorithm 3: Root Container Enforcement
pythonif is_root_container(container):
    container["primaryAxisSizingMode"] = "FIXED"
    container["counterAxisSizingMode"] = "FIXED"
    container["width"] = 375  # Mobile viewport
    container["minHeight"] = 812
    # Remove layout properties from root
    delete container["horizontalSizing"]
    delete container["layoutAlign"]
Purpose: Ensures the top-level container has fixed dimensions for mobile screens.
How They Work in the Pipeline:

Stage 2 outputs JSON with the UI design
Stage 3 receives this JSON and applies these algorithms
The AI interprets these pseudo-code rules and fixes issues
The corrected JSON is saved to figma-ready/

Why They're Important:
The UX/UI Designer (Stage 2) focuses on design intent but might miss technical requirements. These algorithms act as a safety net to:

Fix missing properties
Remove invalid properties
Ensure Figma compatibility
Prevent layout collapse issues

For Your Component Issues, You'd Add:
Algorithm 4: Component Property Validation (Proposed)
pythonfor each component in designer_output:
    componentId = component["componentNodeId"]
    
    # Fix image gallery properties
    if componentId == "10:7816":  # IMAGES component
        if "imageUrl" in component["properties"]:
            # Wrong property name, should be in images array
            component["properties"]["images"] = [component["properties"]["imageUrl"]]
            delete component["properties"]["imageUrl"]
    
    # Fix rating component misuse
    if componentId == "635:4130":  # This is icon/star_rate, not a rating component
        # Convert to proper star icons or rating display
        log_warning("635:4130 is not a rating component")
    
    # Fix text color properties
    if component["type"] == "native-text":
        if "color" in component["properties"]:
            component["properties"]["textColor"] = component["properties"]["color"]
            delete component["properties"]["color"]
    
    # Fix icon swaps
    if "iconSwaps" in component:
        for iconName, iconValue in component["iconSwaps"]:
            if typeof(iconValue) == "string" and not is_component_id(iconValue):
                log_error(f"Invalid icon swap: {iconValue} should be component ID")
These algorithms are essentially automated fix-it rules that clean up the JSON before it goes to Figma. They're written in pseudo-code in the prompt so the AI understands what transformations to apply.
The key insight: These algorithms are reactive fixes for problems that shouldn't exist. Ideally, Stage 2 would output correct JSON, but these algorithms provide a safety net for common issues.

