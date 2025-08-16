#!/usr/bin/env python3

# Let's check exactly what's being sent to the AI

# Load the Visual UX Designer prompt
with open('src/prompts/roles/visual-improvement-analyzer.txt', 'r') as f:
    prompt_template = f.read()

# Load design system data
with open('src/prompts/roles/design-system-scan-data.json', 'r') as f:
    design_system_data = f.read()

# Load user request analyzer output
with open('python_outputs/alt3_20250726_183649_1_user_request_analyzer_output.txt', 'r') as f:
    user_request_output = f.read()

# Load UX designer output 
with open('python_outputs/alt3_20250726_183649_2_ux_ui_designer_output.txt', 'r') as f:
    ux_designer_output = f.read()

# Format the prompt exactly as the test script does
formatted_prompt = prompt_template.replace('{{USER_REQUEST_ANALYZER_OUTPUT}}', user_request_output)
formatted_prompt = formatted_prompt.replace('{{DESIGN_SYSTEM_DATA}}', design_system_data)
formatted_prompt = formatted_prompt.replace('{{CURRENT_LAYOUT_SPECIFICATION}}', ux_designer_output)

print("=== CHECKING WHAT AI RECEIVES ===")
print(f"Original prompt template length: {len(prompt_template)} chars")
print(f"Design system data length: {len(design_system_data)} chars")
print(f"Final formatted prompt length: {len(formatted_prompt)} chars")

# Check if design system data is actually in the final prompt
if "list-item" in formatted_prompt:
    print("✅ Design system contains 'list-item' component")
else:
    print("❌ Design system 'list-item' component NOT found in prompt")

if "10:10214" in formatted_prompt:
    print("✅ Design system contains component ID '10:10214'")
else:
    print("❌ Component ID '10:10214' NOT found in prompt")

if "variantDetails" in formatted_prompt:
    print("✅ Design system variantDetails found in prompt")
else:
    print("❌ variantDetails NOT found in prompt")

# Look for the actual design system section
design_system_start = formatted_prompt.find("## DESIGN_SYSTEM_DATA")
design_system_end = formatted_prompt.find("## CURRENT_LAYOUT_SPECIFICATION")

if design_system_start != -1 and design_system_end != -1:
    design_system_section = formatted_prompt[design_system_start:design_system_end]
    print(f"\n✅ Found design system section ({len(design_system_section)} chars)")
    print("First 500 chars of design system section:")
    print(design_system_section[:500] + "...")
else:
    print("\n❌ Design system section not found in formatted prompt")

# Check for placeholder patterns that might not be replaced
if "{{DESIGN_SYSTEM_DATA}}" in formatted_prompt:
    print("❌ CRITICAL: {{DESIGN_SYSTEM_DATA}} placeholder still in prompt - not replaced!")
else:
    print("✅ {{DESIGN_SYSTEM_DATA}} placeholder was replaced")

if "{{USER_REQUEST_ANALYZER_OUTPUT}}" in formatted_prompt:
    print("❌ CRITICAL: {{USER_REQUEST_ANALYZER_OUTPUT}} placeholder still in prompt!")
else:
    print("✅ {{USER_REQUEST_ANALYZER_OUTPUT}} placeholder was replaced")

if "{{CURRENT_LAYOUT_SPECIFICATION}}" in formatted_prompt:
    print("❌ CRITICAL: {{CURRENT_LAYOUT_SPECIFICATION}} placeholder still in prompt!")
else:
    print("✅ {{CURRENT_LAYOUT_SPECIFICATION}} placeholder was replaced")