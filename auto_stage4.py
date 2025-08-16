#!/usr/bin/env python3
"""
Auto Stage 4 Trigger
Watches for screenshots and automatically runs stages 4-5 when found
"""

import os
import time
import json
import asyncio
import sys
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Import the pipeline class
from instance import Alternative3StagePipeline

class ScreenshotHandler(FileSystemEventHandler):
    def __init__(self, pipeline):
        self.pipeline = pipeline
        self.processed_screenshots = set()
    
    def on_created(self, event):
        if event.is_directory:
            return
            
        filepath = Path(event.src_path)
        
        # Check if it's a screenshot file
        if filepath.name.startswith('screenshot_') and filepath.name.endswith('.png'):
            # Extract run_id from filename
            filename = filepath.stem  # removes .png
            run_id = filename.replace('screenshot_', '')
            
            if run_id not in self.processed_screenshots:
                print(f"🔍 New screenshot detected: {filepath.name}")
                print(f"📋 Extracted run_id: {run_id}")
                
                # Trigger stages 4-5
                asyncio.create_task(self.trigger_visual_stages(run_id, str(filepath)))
                self.processed_screenshots.add(run_id)
    
    async def trigger_visual_stages(self, run_id: str, screenshot_path: str):
        """Trigger stages 4-5 with the screenshot"""
        try:
            print(f"🚀 Starting stages 4-5 for run_id: {run_id}")
            
            # Load previous results from alt3 outputs
            stage1_file = f"python_outputs/alt3_{run_id}_1_user_request_analyzer.json"
            stage2_file = f"python_outputs/alt3_{run_id}_2_ux_ui_designer.json"
            
            if not os.path.exists(stage1_file) or not os.path.exists(stage2_file):
                print(f"❌ Missing previous stage outputs for {run_id}")
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
            result_4 = await self.pipeline.run_alt_stage(4, visual_input, run_id, [], screenshot_path)
            
            # Save stage 4 result
            stage4_file = f"python_outputs/alt3_{run_id}_4_visual_improvement_analyzer.json"
            with open(stage4_file, 'w') as f:
                json.dump({
                    'content': result_4.content,
                    'tokens': result_4.tokens,
                    'execution_time': result_4.execution_time
                }, f, indent=2)
            print(f"💾 Stage 4 saved: {stage4_file}")
            
            # Run stage 5
            print("🔧 Running Stage 5: JSON Engineer (Improved)")
            result_5 = await self.pipeline.run_alt_stage(5, result_4.content, run_id, [])
            
            # Save stage 5 result
            stage5_file = f"python_outputs/alt3_{run_id}_5_json_engineer_improved.json"
            with open(stage5_file, 'w') as f:
                json.dump({
                    'content': result_5.content,
                    'tokens': result_5.tokens,
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

def main():
    # Initialize pipeline
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        sys.exit(1)
    
    pipeline = Alternative3StagePipeline(api_key)
    
    # Setup file watcher
    screenshots_dir = Path("screenshots")
    screenshots_dir.mkdir(exist_ok=True)
    
    event_handler = ScreenshotHandler(pipeline)
    observer = Observer()
    observer.schedule(event_handler, str(screenshots_dir), recursive=False)
    
    print(f"👀 Watching for screenshots in: {screenshots_dir}")
    print("Press Ctrl+C to stop")
    
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n🛑 Screenshot watcher stopped")
    
    observer.join()

if __name__ == "__main__":
    main()