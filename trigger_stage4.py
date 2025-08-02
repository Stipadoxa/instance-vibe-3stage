#!/usr/bin/env python3
"""
Manual Stage 4-5 Trigger
Manually trigger stages 4-5 for existing screenshot
"""

import os
import json
import asyncio
import sys
from pathlib import Path
from instance import Alternative3StagePipeline

async def trigger_visual_stages(run_id: str, screenshot_path: str):
    """Trigger stages 4-5 with the screenshot"""
    try:
        # Initialize pipeline
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ GEMINI_API_KEY not set")
            return
        
        pipeline = Alternative3StagePipeline(api_key)
        
        print(f"🚀 Starting stages 4-5 for run_id: {run_id}")
        
        # Load previous results from alt3 outputs
        stage1_file = f"python_outputs/alt3_{run_id}_1_user_request_analyzer.json"
        stage2_file = f"python_outputs/alt3_{run_id}_2_ux_ui_designer.json"
        
        if not os.path.exists(stage1_file) or not os.path.exists(stage2_file):
            print(f"❌ Missing previous stage outputs for {run_id}")
            print(f"   Looking for: {stage1_file}")
            print(f"   Looking for: {stage2_file}")
            return
        
        # Load stage results
        with open(stage1_file) as f:
            stage1_data = json.load(f)
        with open(stage2_file) as f:
            stage2_data = json.load(f)
        
        stage1_content = stage1_data.get('content', '')
        stage2_content = stage2_data.get('content', '')
        
        # Prepare input for stage 4
        visual_input = f"{stage1_content}\n\n---\n\n{stage2_content}"
        
        # Run stage 4
        print("🎨 Running Stage 4: Visual UX Designer")
        result_4 = await pipeline.run_alt_stage(4, visual_input, run_id, [], screenshot_path)
        
        # Save stage 4 result
        stage4_file = f"python_outputs/alt3_{run_id}_4_visual_improvement_analyzer.json"
        with open(stage4_file, 'w') as f:
            json.dump({
                'content': result_4.content,
                'token_usage': result_4.token_usage,
                'execution_time': result_4.execution_time
            }, f, indent=2)
        print(f"💾 Stage 4 saved: {stage4_file}")
        
        # Run stage 5
        print("🔧 Running Stage 5: JSON Engineer (Improved)")
        result_5 = await pipeline.run_alt_stage(5, result_4.content, run_id, [])
        
        # Save stage 5 result
        stage5_file = f"python_outputs/alt3_{run_id}_5_json_engineer_improved.json"
        with open(stage5_file, 'w') as f:
            json.dump({
                'content': result_5.content,
                'token_usage': result_5.token_usage,
                'execution_time': result_5.execution_time
            }, f, indent=2)
        print(f"💾 Stage 5 saved: {stage5_file}")
        
        # Generate final improved JSON
        try:
            improved_json = json.loads(result_5.content)
            figma_ready_dir = Path("figma-ready")
            figma_ready_dir.mkdir(exist_ok=True)
            final_json_file = figma_ready_dir / f"figma_ready_improved_{run_id}.json"
            
            with open(final_json_file, 'w') as f:
                json.dump(improved_json, f, indent=2)
            print(f"✅ Improved JSON saved: {final_json_file}")
            
        except json.JSONDecodeError as e:
            print(f"❌ Could not parse improved JSON: {e}")
        
        print(f"🎉 Visual feedback pipeline completed for {run_id}")
        
    except Exception as e:
        print(f"❌ Error in visual stages: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 trigger_stage4.py <run_id>")
        print("Example: python3 trigger_stage4.py 20250727_183302")
        sys.exit(1)
    
    run_id = sys.argv[1]
    screenshot_path = f"screenshots/screenshot_{run_id}.png"
    
    if not os.path.exists(screenshot_path):
        print(f"❌ Screenshot not found: {screenshot_path}")
        sys.exit(1)
    
    print(f"📸 Using screenshot: {screenshot_path}")
    asyncio.run(trigger_visual_stages(run_id, screenshot_path))