#!/usr/bin/env python3
"""
Manual Stage 5 Trigger
"""

import os
import json
import asyncio
import sys
from pathlib import Path
from instance import Alternative3StagePipeline

async def run_stage5(run_id: str):
    """Run stage 5 with stage 4 output"""
    try:
        # Initialize pipeline
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ GEMINI_API_KEY not set")
            return
        
        pipeline = Alternative3StagePipeline(api_key)
        
        print(f"🔧 Running Stage 5 for run_id: {run_id}")
        
        # Load stage 4 result
        stage4_file = f"python_outputs/alt3_{run_id}_4_visual_ux_designer.json"
        
        if not os.path.exists(stage4_file):
            print(f"❌ Missing stage 4 output: {stage4_file}")
            return
        
        with open(stage4_file) as f:
            stage4_data = json.load(f)
        
        stage4_content = stage4_data.get('content', '')
        
        # Run stage 5
        print("🔧 Running Stage 5: JSON Engineer (Improved)")
        result_5 = await pipeline.run_alt_stage(5, stage4_content, run_id, [])
        
        # Generate final improved JSON
        try:
            # Extract JSON from the content
            content = result_5.content
            if content.startswith('```json'):
                content = content.split('```json')[1].split('```')[0].strip()
            elif content.startswith('```'):
                content = content.split('```')[1].split('```')[0].strip()
            
            improved_json = json.loads(content)
            figma_ready_dir = Path("figma-ready")
            figma_ready_dir.mkdir(exist_ok=True)
            final_json_file = figma_ready_dir / f"figma_ready_improved_{run_id}.json"
            
            with open(final_json_file, 'w') as f:
                json.dump(improved_json, f, indent=2)
            print(f"✅ Improved JSON saved: {final_json_file}")
            
        except json.JSONDecodeError as e:
            print(f"❌ Could not parse improved JSON: {e}")
            print(f"Raw content: {result_5.content[:500]}...")
        
        print(f"🎉 Stage 5 completed for {run_id}")
        
    except Exception as e:
        print(f"❌ Error in stage 5: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 run_stage5.py <run_id>")
        print("Example: python3 run_stage5.py 20250727_183302")
        sys.exit(1)
    
    run_id = sys.argv[1]
    asyncio.run(run_stage5(run_id))