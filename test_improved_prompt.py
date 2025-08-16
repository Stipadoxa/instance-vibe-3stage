#!/usr/bin/env python3

import asyncio
import json
import time
import sys
import os
import google.generativeai as genai
from pathlib import Path

async def test_improved_visual_analyzer():
    """Test the improved Visual UX Designer prompt"""
    
    # Load the improved Visual UX Designer prompt
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
    
    # Combine for input_data (format expected by format_visual_analyzer_prompt)
    input_data = f"{user_request_output}\n\n---\n\n{ux_designer_output}"
    
    # Format the prompt manually (using new template structure)
    formatted_prompt = prompt_template.replace('{{USER_REQUEST_ANALYZER_OUTPUT}}', user_request_output)
    formatted_prompt = formatted_prompt.replace('{{DESIGN_SYSTEM_DATA}}', design_system_data)
    formatted_prompt = formatted_prompt.replace('{{CURRENT_LAYOUT_SPECIFICATION}}', ux_designer_output)
    formatted_prompt += "\n\nSCREENSHOT: Analyze the provided screenshot image for this assessment."
    
    print("🔄 Testing IMPROVED Visual UX Designer prompt...")
    print(f"📊 Design system data: {len(design_system_data)} characters")
    print(f"📋 Input data: {len(input_data)} characters")
    
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
    
    # Call AI with screenshot
    screenshot_path = "screenshots/screenshot_20250726_183649.png"
    start_time = time.time()
    
    try:
        # Prepare content with screenshot
        content = [formatted_prompt]
        
        # Add screenshot
        if os.path.exists(screenshot_path):
            import PIL.Image
            img = PIL.Image.open(screenshot_path)
            content.append(img)
            print(f"📸 Added screenshot: {screenshot_path}")
        else:
            print(f"❌ Screenshot not found: {screenshot_path}")
            return None
        
        response = await gemini_client.generate_content_async(content)
        ai_response = response.text
        token_usage = {
            'prompt_tokens': len(formatted_prompt.split()) // 1.3,
            'completion_tokens': len(ai_response.split()) // 1.3,
        }
        
        execution_time = time.time() - start_time
        
        print(f"✅ IMPROVED Visual UX Designer completed in {execution_time:.2f}s")
        print(f"🎯 Token usage: {token_usage}")
        
        # Save output for comparison
        timestamp = "20250726_improved"
        
        # Save JSON response
        with open(f'python_outputs/test_{timestamp}_4_visual_ux_designer.json', 'w') as f:
            json.dump({
                "stage": 4,
                "role": "visual_ux_designer_improved", 
                "timestamp": timestamp,
                "execution_time": execution_time,
                "token_usage": token_usage,
                "response": ai_response
            }, f, indent=2)
        
        # Save text output
        with open(f'python_outputs/test_{timestamp}_4_visual_ux_designer_output.txt', 'w') as f:
            f.write(ai_response)
        
        print(f"💾 Saved outputs to test_{timestamp}_4_visual_ux_designer.*")
        print("📋 Response preview:")
        print(ai_response[:800] + "..." if len(ai_response) > 800 else ai_response)
        
        return ai_response
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(test_improved_visual_analyzer())