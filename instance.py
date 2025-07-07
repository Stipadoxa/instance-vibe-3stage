#!/usr/bin/env python3
"""
Instance Vibe Pipeline Runner
Standalone Python implementation for testing the AI pipeline without Figma

Usage:
    python instance.py 1                    # Run stage 1 only
    python instance.py 2                    # Run stage 2 only (requires stage 1 output)
    python instance.py all                  # Run all stages
    python instance.py all --input "text"   # Run all stages with custom input
    python instance.py --help               # Show help
"""

import os
import sys
import re
import json
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import google.generativeai as genai
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio
import threading

# Add path for src modules
sys.path.append(os.path.abspath('src'))
# JSONMigrator is TypeScript, skip for now

# Load environment variables from .env file
def load_env():
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Load environment variables at module import
load_env()


@dataclass
class StageMetadata:
    stage: str
    ai_used: bool
    prompt_used: bool
    prompt_length: int
    execution_time: float
    token_usage: Optional[Dict[str, Any]] = None


@dataclass
class StageResult:
    content: str
    metadata: StageMetadata


class PipelineRunner:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.gemini_client = None
        self.output_dir = Path("./python_outputs")
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize Gemini if API key provided
        if api_key:
            genai.configure(api_key=api_key)
            self.gemini_client = genai.GenerativeModel('gemini-1.5-flash')
            print("🤖 Initialized with Gemini AI")
        else:
            print("📋 Running in placeholder mode (no API key)")
    
    def load_prompt(self, stage_num: int) -> str:
        """Load prompt file for given stage"""
        prompt_files = {
            1: "src/prompts/roles/1 product-manager.txt",
            2: "src/prompts/roles/2 product-designer.txt", 
            3: "src/prompts/roles/3 ux-designer.txt",
            4: "src/prompts/roles/4 ui-designer.txt",
            5: "src/prompts/roles/5 json-engineer.txt"
        }
        
        prompt_file = prompt_files.get(stage_num)
        if not prompt_file or not os.path.exists(prompt_file):
            raise ValueError(f"Prompt file not found for stage {stage_num}")
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            with open(prompt_file, 'r', encoding='latin-1') as f:
                return f.read()
    
    def format_prompt(self, prompt_template: str, user_input: str) -> str:
        """Format prompt with user input"""
        return prompt_template.replace('[USER_INPUT]', user_input)
    
    async def call_ai(self, prompt: str) -> tuple[str, Dict[str, Any]]:
        """Call Gemini AI with prompt"""
        if not self.gemini_client:
            # Placeholder response
            return f"[PLACEHOLDER RESPONSE - No AI client available]\n\nPrompt was: {prompt[:200]}...", {}
        
        try:
            response = await self.gemini_client.generate_content_async(prompt)
            token_usage = {
                'prompt_tokens': len(prompt.split()) // 1.3,  # Rough estimate
                'completion_tokens': len(response.text.split()) // 1.3,
                'total_tokens': len(prompt.split()) // 1.3 + len(response.text.split()) // 1.3
            }
            return response.text, token_usage
        except Exception as e:
            print(f"❌ AI call failed: {e}")
            return f"[ERROR - AI call failed: {e}]", {}
    
    def save_stage_output(self, stage_num: int, stage_name: str, result: StageResult, run_id: str):
        """Save stage output to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{run_id}_{stage_num}_{stage_name.lower().replace(' ', '_')}.json"
        filepath = self.output_dir / filename
        
        output_data = {
            "stage": stage_num,
            "stage_name": stage_name,
            "timestamp": timestamp,
            "content": result.content,
            "metadata": asdict(result.metadata)
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Stage {stage_num} output saved to: {filepath}")
    
    def save_ai_output(self, stage_num: int, stage_name: str, content: str, run_id: str):
        """Save just the AI output content to a text file for easy viewing"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{run_id}_{stage_num}_{stage_name.lower().replace(' ', '_')}_output.txt"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"📄 AI output saved to: {filepath}")
    
    def load_stage_output(self, stage_num: int, run_id: str) -> Optional[StageResult]:
        """Load previous stage output"""
        stage_names = {
            1: "product_manager",
            2: "product_designer", 
            3: "ux_designer",
            4: "ui_designer",
            5: "json_engineer"
        }
        
        stage_name = stage_names.get(stage_num)
        if not stage_name:
            return None
        
        # Find the most recent output file for this stage
        pattern = f"{run_id}_{stage_num}_{stage_name}.json"
        filepath = self.output_dir / pattern
        
        if not filepath.exists():
            # Try to find any file for this stage
            pattern = f"*_{stage_num}_{stage_name}.json"
            files = list(self.output_dir.glob(pattern))
            if files:
                filepath = max(files, key=lambda f: f.stat().st_mtime)
            else:
                return None
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = StageMetadata(**data['metadata'])
            return StageResult(content=data['content'], metadata=metadata)
        except Exception as e:
            print(f"❌ Failed to load stage {stage_num} output: {e}")
            return None
    
    async def run_stage(self, stage_num: int, input_data: str, run_id: str) -> StageResult:
        """Run a single pipeline stage"""
        stage_names = {
            1: "Product Manager",
            2: "Product Designer",
            3: "UX Designer", 
            4: "UI Designer",
            5: "JSON Engineer"
        }
        
        stage_name = stage_names[stage_num]
        print(f"\n🚀 Stage {stage_num}/5: {stage_name}")
        print(f"📤 Input length: {len(input_data)} characters")
        
        start_time = time.time()
        
        # Load prompt
        prompt_template = self.load_prompt(stage_num)
        prompt = self.format_prompt(prompt_template, input_data)
        
        # Execute AI call
        ai_response, token_usage = await self.call_ai(prompt)
        
        execution_time = time.time() - start_time
        
        # Create result
        metadata = StageMetadata(
            stage=stage_name,
            ai_used=bool(self.gemini_client),
            prompt_used=True,
            prompt_length=len(prompt_template),
            execution_time=execution_time,
            token_usage=token_usage
        )
        
        result = StageResult(content=ai_response, metadata=metadata)
        
        # Save output
        self.save_stage_output(stage_num, stage_name, result, run_id)
        
        # Also save just the AI response for easy viewing
        self.save_ai_output(stage_num, stage_name, ai_response, run_id)
        
        print(f"📥 Output length: {len(result.content)} characters")
        print(f"⏱️ Execution time: {execution_time:.2f}s")
        print(f"🤖 AI used: {'Yes' if metadata.ai_used else 'No'}")
        
        return result
    
    async def run_all_stages(self, initial_input: str) -> Dict[str, Any]:
        """Run all pipeline stages"""
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        print(f"🎯 Starting full pipeline run: {run_id}")
        print(f"📝 Initial input: {initial_input[:100]}...")
        
        results = {}
        current_input = initial_input
        
        for stage_num in range(1, 6):
            result = await self.run_stage(stage_num, current_input, run_id)
            results[f"stage_{stage_num}"] = result
            current_input = result.content
        
        # Save summary
        summary = {
            "run_id": run_id,
            "initial_input": initial_input,
            "total_stages": 5,
            "ai_enabled": bool(self.gemini_client),
            "results": {k: asdict(v) for k, v in results.items()}
        }
        
        summary_file = self.output_dir / f"{run_id}_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Pipeline completed! Summary saved to: {summary_file}")
        return summary
    
    async def run_single_stage(self, stage_num: int, run_id: Optional[str] = None) -> StageResult:
        """Run a single stage, loading input from previous stage if needed"""
        if not run_id:
            run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if stage_num == 1:
            # Stage 1 needs user input
            default_input = "Create a modern task management application for small teams"
            user_input = input(f"Enter input for stage 1 (or press Enter for default): ").strip()
            if not user_input:
                user_input = default_input
            return await self.run_stage(1, user_input, run_id)
        else:
            # Load previous stage output
            prev_result = self.load_stage_output(stage_num - 1, run_id)
            if not prev_result:
                print(f"❌ Cannot find output from stage {stage_num - 1}")
                print(f"💡 Try running stage {stage_num - 1} first, or run 'all' stages")
                sys.exit(1)
            
            return await self.run_stage(stage_num, prev_result.content, run_id)


class Alternative3StagePipeline:
    """Alternative 3-stage pipeline: User Request Analyzer -> UX UI Designer -> JSON Engineer"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.gemini_client = None
        self.output_dir = Path("./python_outputs")
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize Gemini if API key provided
        if api_key:
            genai.configure(api_key=api_key)
            self.gemini_client = genai.GenerativeModel('gemini-1.5-flash')
            print("🤖 Initialized Alternative 3-Stage Pipeline with Gemini AI")
        else:
            print("📋 Running Alternative 3-Stage Pipeline in placeholder mode (no API key)")
    
    def load_alt_prompt(self, stage_num: int) -> str:
        """Load prompt file for alternative pipeline stage"""
        alt_prompt_files = {
            1: "src/prompts/roles/alt1-user-request-analyzer.txt",
            2: "src/prompts/roles/alt2-ux-ui-designer.txt",
            3: "src/prompts/roles/5 json-engineer.txt"  # Reuse existing JSON Engineer
        }
        
        prompt_file = alt_prompt_files.get(stage_num)
        if not prompt_file or not os.path.exists(prompt_file):
            raise ValueError(f"Alternative prompt file not found for stage {stage_num}")
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            with open(prompt_file, 'r', encoding='latin-1') as f:
                return f.read()
    
    def format_prompt(self, prompt_template: str, user_input: str) -> str:
        """Format prompt with user input"""
        # Handle different placeholder formats
        formatted = prompt_template.replace('{{USER_REQUEST}}', user_input)
        formatted = formatted.replace('{{PLATFORM}}', 'Mobile')  # Default platform
        formatted = formatted.replace('{{UX_UI_DESIGNER_OUTPUT}}', user_input)  # For JSON Engineer stage
        formatted = formatted.replace('[USER_INPUT]', user_input)  # Fallback
        return formatted
    
    def load_design_system_data(self) -> str:
        """Load design system scan data for UX UI Designer stage"""
        # Use live data if available
        if hasattr(self, 'live_design_system_data') and self.live_design_system_data:
            if isinstance(self.live_design_system_data, list):
                print(f"📊 Using live design system data: {len(self.live_design_system_data)} components")
                # Debug: show first component for verification
                if len(self.live_design_system_data) > 0:
                    first_component = self.live_design_system_data[0]
                    print(f"🔍 First component example: {first_component.get('id', 'no-id')} - {first_component.get('name', 'no-name')} - {first_component.get('suggestedType', 'no-type')}")
                return json.dumps(self.live_design_system_data, indent=2)
            else:
                return str(self.live_design_system_data)
        
        # Fallback to static file
        design_system_file = "src/prompts/roles/design-system-scan-data.json"
        if not os.path.exists(design_system_file):
            return "No design system data available"
        
        try:
            with open(design_system_file, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"❌ Failed to load design system data: {e}")
            return "Design system data loading failed"
    
    def format_ux_ui_prompt(self, prompt_template: str, analyzer_output: str, design_system_data: str) -> str:
        """Format UX UI Designer prompt with analyzer output and design system data"""
        # Replace placeholders in prompt with actual content
        formatted_prompt = prompt_template.replace('{{USER_REQUEST_ANALYZER_OUTPUT}}', analyzer_output)
        formatted_prompt = formatted_prompt.replace('{{DESIGN_SYSTEM_DATA}}', design_system_data)
        
        return formatted_prompt
    
    async def call_ai(self, prompt: str) -> tuple[str, Dict[str, Any]]:
        """Call Gemini AI with prompt"""
        if not self.gemini_client:
            # Placeholder response
            return f"[PLACEHOLDER RESPONSE - No AI client available]\n\nPrompt was: {prompt[:200]}...", {}
        
        try:
            response = await self.gemini_client.generate_content_async(prompt)
            token_usage = {
                'prompt_tokens': len(prompt.split()) // 1.3,  # Rough estimate
                'completion_tokens': len(response.text.split()) // 1.3,
                'total_tokens': len(prompt.split()) // 1.3 + len(response.text.split()) // 1.3
            }
            return response.text, token_usage
        except Exception as e:
            print(f"❌ AI call failed: {e}")
            return f"[ERROR - AI call failed: {e}]", {}
    
    def save_alt_stage_output(self, stage_num: int, stage_name: str, result: StageResult, run_id: str):
        """Save alternative pipeline stage output to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"alt3_{run_id}_{stage_num}_{stage_name.lower().replace(' ', '_')}.json"
        filepath = self.output_dir / filename
        
        output_data = {
            "pipeline": "alternative_3_stage",
            "stage": stage_num,
            "stage_name": stage_name,
            "timestamp": timestamp,
            "content": result.content,
            "metadata": asdict(result.metadata)
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Alt Stage {stage_num} output saved to: {filepath}")
    
    def save_alt_ai_output(self, stage_num: int, stage_name: str, content: str, run_id: str):
        """Save just the AI output content to a text file for easy viewing"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"alt3_{run_id}_{stage_num}_{stage_name.lower().replace(' ', '_')}_output.txt"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"📄 Alt AI output saved to: {filepath}")
    
    async def run_alt_stage(self, stage_num: int, input_data: str, run_id: str) -> StageResult:
        """Run a single alternative pipeline stage"""
        alt_stage_names = {
            1: "User Request Analyzer",
            2: "UX UI Designer",
            3: "JSON Engineer"
        }
        
        stage_name = alt_stage_names[stage_num]
        print(f"\n🚀 Alt Stage {stage_num}/3: {stage_name}")
        print(f"📤 Input length: {len(input_data)} characters")
        
        start_time = time.time()
        
        # Load prompt and format it based on stage
        prompt_template = self.load_alt_prompt(stage_num)
        
        if stage_num == 2:  # UX UI Designer stage needs design system data
            design_system_data = self.load_design_system_data()
            prompt = self.format_ux_ui_prompt(prompt_template, input_data, design_system_data)
            print(f"📊 Loaded design system data: {len(design_system_data)} characters")
        else:
            prompt = self.format_prompt(prompt_template, input_data)
        
        # Execute AI call
        ai_response, token_usage = await self.call_ai(prompt)
        
        execution_time = time.time() - start_time
        
        # Create result
        metadata = StageMetadata(
            stage=stage_name,
            ai_used=bool(self.gemini_client),
            prompt_used=True,
            prompt_length=len(prompt_template),
            execution_time=execution_time,
            token_usage=token_usage
        )
        
        result = StageResult(content=ai_response, metadata=metadata)
        
        # Save output
        self.save_alt_stage_output(stage_num, stage_name, result, run_id)
        
        # Also save just the AI response for easy viewing
        self.save_alt_ai_output(stage_num, stage_name, ai_response, run_id)
        
        print(f"📥 Output length: {len(result.content)} characters")
        print(f"⏱️ Execution time: {execution_time:.2f}s")
        print(f"🤖 AI used: {'Yes' if metadata.ai_used else 'No'}")
        
        return result
    
    async def run_all_alt_stages(self, initial_input: str) -> Dict[str, Any]:
        """Run all alternative pipeline stages"""
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        print(f"🎯 Starting Alternative 3-Stage Pipeline run: {run_id}")
        print(f"📝 Initial input: {initial_input[:100]}...")
        
        results = {}
        current_input = initial_input
        
        for stage_num in range(1, 4):  # Only 3 stages
            result = await self.run_alt_stage(stage_num, current_input, run_id)
            results[f"stage_{stage_num}"] = result
            current_input = result.content
            
        # Apply JSON migration
        final_json_str = results["stage_3"].content
        
        # Use regex to extract the JSON
        match = re.search(r'```json\n(.*)\n```', final_json_str, re.DOTALL)
        if match:
            final_json_str = match.group(1)

        try:
            final_json = json.loads(final_json_str)
            # Skip JSONMigrator for now (TypeScript only)
            results["stage_3"].content = json.dumps(final_json, indent=2)
            print("✅ JSON parsing successful (migration skipped)")
        except json.JSONDecodeError as e:
            print(f"❌ Could not parse final JSON: {e}")

        # Generate summary
        summary = {
            "pipeline": "alternative_3_stage", 
            "run_id": run_id,
            "initial_input": initial_input,
            "total_stages": 3,
            "ai_enabled": bool(self.gemini_client),
            "results": {k: asdict(v) for k, v in results.items()}
        }
        
        return {
            "success": True,
            "run_id": run_id,
            "stages": results,
            "summary": summary
        }
    


class HTTPServer:
    """HTTP Server for Figma Plugin Integration"""
    
    def __init__(self, api_key: Optional[str] = None, port: int = 8000):
        self.app = Flask(__name__)
        CORS(self.app)  # Enable CORS for Figma plugin
        self.port = port
        self.pipeline = Alternative3StagePipeline(api_key)
        self.setup_routes()
    
    def setup_routes(self):
        """Setup API endpoints"""
        
        @self.app.route('/api/health', methods=['GET'])
        def health_check():
            return jsonify({"status": "healthy", "message": "3-Stage Pipeline Server Running"})
        
        @self.app.route('/api/generate', methods=['POST'])
        def generate_ui():
            try:
                data = request.json
                if not data or 'prompt' not in data:
                    return jsonify({"error": "Missing prompt in request"}), 400
                
                # Create a fresh pipeline instance for this request
                fresh_pipeline = Alternative3StagePipeline(self.pipeline.api_key)
                
                # Use live design system data if provided
                if 'design_system_data' in data:
                    fresh_pipeline.live_design_system_data = data['design_system_data']
                    print(f"📊 Using live design system data: {len(data['design_system_data'])} components")
                
                # Run the pipeline in a new event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    result = loop.run_until_complete(
                        fresh_pipeline.run_all_alt_stages(data['prompt'])
                    )
                    return jsonify(result)
                finally:
                    loop.close()
                    
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        
    
    def run(self):
        """Start the HTTP server"""
        print(f"🚀 Starting HTTP Server on http://localhost:{self.port}")
        print(f"🔗 Health check: http://localhost:{self.port}/api/health")
        print(f"📝 Generate API: http://localhost:{self.port}/api/generate")
        print(f"🛑 Press Ctrl+C to stop")
        
        self.app.run(host='localhost', port=self.port, debug=False, threaded=True)


def main():
    parser = argparse.ArgumentParser(description="Instance Vibe Pipeline Runner")
    parser.add_argument("stage", help="Stage to run (1-5, 'all', 'alt3', 'server', or 'alt3-1', 'alt3-2', 'alt3-3')")
    parser.add_argument("--input", help="Custom input for stage 1 or full pipeline")
    parser.add_argument("--api-key", help="Gemini API key (or use GEMINI_API_KEY env var)")
    parser.add_argument("--run-id", help="Run ID to continue from previous execution")
    parser.add_argument("--original-prompt", help="Original prompt for modification pipeline")
    parser.add_argument("--modification", help="Modification request for existing UI")
    parser.add_argument("--port", type=int, default=8000, help="Port for HTTP server (default: 8000)")
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or os.getenv("GEMINI_API_KEY")
    
    # Run the specified stage(s)
    import asyncio
    
    if args.stage == "all":
        # Original 5-stage pipeline
        runner = PipelineRunner(api_key)
        default_input = "create a login page for a SaaS app"
        initial_input = args.input or default_input
        asyncio.run(runner.run_all_stages(initial_input))
    
    elif args.stage == "alt3":
        # Alternative 3-stage pipeline
        alt_runner = Alternative3StagePipeline(api_key)
        default_input = "create a login page for a SaaS app"
        initial_input = args.input or default_input
        asyncio.run(alt_runner.run_all_alt_stages(initial_input))
    
    
    elif args.stage.startswith("alt3-"):
        # Single stage from alternative 3-stage pipeline
        alt_runner = Alternative3StagePipeline(api_key)
        stage_num = int(args.stage.split("-")[1])
        if stage_num < 1 or stage_num > 3:
            print("❌ Alt3 stage must be between 1 and 3")
            sys.exit(1)
        
        if not args.input:
            print("❌ --input is required for individual alt3 stages")
            sys.exit(1)
            
        run_id = args.run_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        asyncio.run(alt_runner.run_alt_stage(stage_num, args.input, run_id))
    
    elif args.stage.isdigit():
        # Single stage from original pipeline
        runner = PipelineRunner(api_key)
        stage_num = int(args.stage)
        if stage_num < 1 or stage_num > 5:
            print("❌ Stage must be between 1 and 5")
            sys.exit(1)
        
        asyncio.run(runner.run_single_stage(stage_num, args.run_id))
    
    elif args.stage == "server":
        # HTTP Server for Figma Plugin Integration
        server = HTTPServer(api_key, args.port)
        server.run()
    
    else:
        print("❌ Invalid stage. Use 1-5, 'all', 'alt3', 'server', or 'alt3-1', 'alt3-2', 'alt3-3'")
        sys.exit(1)


if __name__ == "__main__":
    main()
