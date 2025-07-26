#!/usr/bin/env python3

import asyncio
import json
import time
import sys
import os
import google.generativeai as genai
from pathlib import Path

async def test_json_engineer_stage5():
    """Manually test JSON Engineer Stage 5 with Visual UX Designer output"""
    
    # Load the JSON Engineer prompt
    with open('src/prompts/roles/5 json-engineer.txt', 'r') as f:
        prompt_template = f.read()
    
    # Load design system data
    with open('src/prompts/roles/design-system-scan-data.json', 'r') as f:
        design_system_data = f.read()
    
    # Load Visual UX Designer output (Stage 4)
    with open('python_outputs/manual_20250726_183649_4_visual_ux_designer_output.txt', 'r') as f:
        visual_ux_output = f.read()
    
    # Load original user request for context
    with open('python_outputs/alt3_20250726_183649_1_user_request_analyzer_output.txt', 'r') as f:
        user_request_output = f.read()
    
    # Extract and format the improved layout data to match Stage 2 format
    import json
    # Parse the Stage 4 output to extract improvedLayoutData
    visual_ux_json = json.loads(visual_ux_output.strip().replace('```json\n', '').replace('\n```', ''))
    improved_layout = visual_ux_json.get('improvedLayoutData', {})
    
    # Check if improvedLayoutData has the expected structure
    if 'designRationale' in improved_layout and 'layoutContainer' in improved_layout:
        design_rationale = improved_layout['designRationale']
        layout_container = improved_layout['layoutContainer']
        
        # Format as two separate JSON blocks like Stage 2 with correct separator
        stage2_format = f"""{json.dumps(design_rationale, indent=2)}
---RATIONALE-SEPARATOR---
{json.dumps(layout_container, indent=2)}"""
    else:
        # Fallback to original format if structure is unexpected
        stage2_format = json.dumps(improved_layout, indent=2)
    
    # Combine for input_data (user request + Stage 2 formatted layout)
    input_data = f"{user_request_output}\n\n---\n\n{stage2_format}"
    
    # Format the prompt (similar to format_ux_ui_prompt)
    formatted_prompt = prompt_template.replace('{{INPUT_DATA}}', input_data)
    formatted_prompt = formatted_prompt.replace('{{DESIGN_SYSTEM_DATA}}', design_system_data)
    
    print("🔄 Starting JSON Engineer Stage 5 (improved JSON)...")
    print(f"📊 Design system data: {len(design_system_data)} characters")
    print(f"📋 Input data: {len(input_data)} characters")
    
    # Debug: Show what Stage 5 is receiving
    print("\n🔍 DEBUG: Stage 5 input preview:")
    print("First 1000 chars:", input_data[:1000])
    print("\n🔍 DEBUG: Last 1000 chars:")
    print(input_data[-1000:] if len(input_data) > 1000 else "Input too short")
    
    # Load API key from .env file
    api_key = None
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GEMINI_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break
    
    if not api_key:
        print("❌ No GEMINI_API_KEY found in .env")
        return None
    
    genai.configure(api_key=api_key)
    gemini_client = genai.GenerativeModel('gemini-1.5-flash')
    
    start_time = time.time()
    
    try:
        # Call AI (no visual references for JSON Engineer)
        response = await gemini_client.generate_content_async(formatted_prompt)
        ai_response = response.text
        token_usage = {
            'prompt_tokens': len(formatted_prompt.split()) // 1.3,
            'completion_tokens': len(ai_response.split()) // 1.3,
        }
        
        execution_time = time.time() - start_time
        
        print(f"✅ JSON Engineer Stage 5 completed in {execution_time:.2f}s")
        print(f"🎯 Token usage: {token_usage}")
        
        # Save output files
        timestamp = "20250726_183649"
        
        # Save JSON response
        with open(f'python_outputs/manual_{timestamp}_5_json_engineer.json', 'w') as f:
            json.dump({
                "stage": 5,
                "role": "json_engineer_improved", 
                "timestamp": timestamp,
                "execution_time": execution_time,
                "token_usage": token_usage,
                "response": ai_response
            }, f, indent=2)
        
        # Save text output
        with open(f'python_outputs/manual_{timestamp}_5_json_engineer_output.txt', 'w') as f:
            f.write(ai_response)
        
        # Try to extract and save the final JSON
        try:
            # Look for JSON in the response
            start_marker = ai_response.find('{')
            end_marker = ai_response.rfind('}') + 1
            
            if start_marker != -1 and end_marker > start_marker:
                json_content = ai_response[start_marker:end_marker]
                parsed_json = json.loads(json_content)
                
                # Save as figma-ready improved JSON
                with open(f'figma-ready/figma_ready_improved_{timestamp}.json', 'w') as f:
                    json.dump(parsed_json, f, indent=2)
                
                print(f"💾 Saved improved JSON to figma-ready/figma_ready_improved_{timestamp}.json")
        except Exception as e:
            print(f"⚠️ Could not extract JSON from response: {e}")
        
        print(f"💾 Saved outputs to manual_{timestamp}_5_json_engineer.*")
        print("📋 Response preview:")
        print(ai_response[:500] + "..." if len(ai_response) > 500 else ai_response)
        
        return ai_response
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(test_json_engineer_stage5())