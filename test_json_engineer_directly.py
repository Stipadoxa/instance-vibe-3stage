#!/usr/bin/env python3
"""
Test script to run JSON Engineer directly on Stage 2 output without QA
"""

import os
import sys
import json
import time
import google.generativeai as genai
from datetime import datetime
from pathlib import Path

# Add current directory to path
sys.path.append('.')

# Load Stage 2 output
with open('temp_stage2_output_for_test.txt', 'r') as f:
    stage2_output = f.read()

print("🔧 Stage 2 output loaded")
print(f"Content length: {len(stage2_output)} characters")

# Configure Gemini API
try:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    genai.configure(api_key=api_key)
    print("✅ Gemini API configured")
except Exception as e:
    print(f"❌ Gemini API setup failed: {e}")
    sys.exit(1)

# Load JSON Engineer prompt
json_engineer_prompt_path = "src/prompts/roles/5 json-engineer.txt"
if not os.path.exists(json_engineer_prompt_path):
    print(f"❌ JSON Engineer prompt not found at {json_engineer_prompt_path}")
    sys.exit(1)

with open(json_engineer_prompt_path, 'r') as f:
    json_engineer_prompt = f.read()

print("✅ JSON Engineer prompt loaded")

# Load design system data (latest file)
design_system_files = sorted([f for f in os.listdir('design-system/') if f.startswith('design-system-raw-data-') and f.endswith('.json')])
if not design_system_files:
    print("❌ No design system files found")
    sys.exit(1)

latest_design_system = design_system_files[-1]
design_system_path = f"design-system/{latest_design_system}"

with open(design_system_path, 'r') as f:
    design_system_data = f.read()

print(f"✅ Design system data loaded: {latest_design_system}")

# Prepare the full prompt
full_prompt = f"""
{json_engineer_prompt}

# DESIGN_SYSTEM_DATA

{design_system_data}

# STAGE_2_OUTPUT

{stage2_output}

Please process this Stage 2 output into final Figma-ready JSON.
"""

print(f"📝 Full prompt prepared (length: {len(full_prompt)} characters)")
print("🚀 Calling Gemini API...")

try:
    # Call Gemini API
    model = genai.GenerativeModel('gemini-1.5-pro')
    response = model.generate_content(
        full_prompt,
        generation_config={
            'temperature': 0.1,
            'max_output_tokens': 8192
        }
    )
    
    result_content = response.text
    print("✅ Gemini API call successful")
    print(f"Response length: {len(result_content)} characters")
    
    # Save result
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_filename = f"python_outputs/test_no_qa_{timestamp}_3_json_engineer_output.txt"
    
    with open(result_filename, 'w') as f:
        f.write(result_content)
    
    print(f"💾 Result saved to: {result_filename}")
    
    # Try to extract JSON from result
    try:
        # Look for JSON block
        if '```json' in result_content:
            json_start = result_content.find('```json') + 7
            json_end = result_content.find('```', json_start)
            json_content = result_content[json_start:json_end].strip()
        else:
            json_content = result_content.strip()
        
        # Validate JSON
        parsed_json = json.loads(json_content)
        
        # Save JSON file
        json_filename = f"figma-ready/figma_ready_test_no_qa_{timestamp}.json"
        with open(json_filename, 'w') as f:
            json.dump(parsed_json, f, indent=2)
        
        print(f"✅ Valid JSON extracted and saved to: {json_filename}")
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing failed: {e}")
        print("Raw response saved only")
    
except Exception as e:
    print(f"❌ Gemini API call failed: {e}")
    sys.exit(1)

print("🎉 Test completed successfully!")