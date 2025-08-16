#!/usr/bin/env python3
"""
Standalone QA runner for testing the QA loop independently.
Usage: python3 scripts/run_qa.py <timestamp> [--iterations N]
"""

import sys
import json
import argparse
from pathlib import Path
import os

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.design_qa import DesignQA

def main():
    parser = argparse.ArgumentParser(description='Run QA validation on designer output')
    parser.add_argument('timestamp', help='Timestamp of the design to validate')
    parser.add_argument('--iterations', type=int, default=3, help='Max QA iterations (default: 3)')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    parser.add_argument('--api-key', help='Gemini API key (or use GEMINI_API_KEY env var)')
    
    args = parser.parse_args()
    
    # Load designer output
    designer_file = Path(f"python_outputs/alt3_{args.timestamp}_2_ux_ui_designer.json")
    if not designer_file.exists():
        print(f"❌ Designer output not found: {designer_file}")
        sys.exit(1)
    
    with open(designer_file, 'r') as f:
        designer_data = json.load(f)
        # Pass the raw AI response string - QA module will extract JSON
        designer_output = designer_data.get('ai_response', '')
    
    # Also try the output text file if needed
    if not designer_output:
        text_file = Path(f"python_outputs/alt3_{args.timestamp}_2_ux_ui_designer_output.txt")
        if text_file.exists():
            with open(text_file, 'r') as f:
                designer_output = f.read()
    
    # Initialize QA
    api_key = args.api_key or os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable not set and --api-key not provided")
        sys.exit(1)
    
    qa = DesignQA(api_key)
    
    # Run QA loop
    fixed_json, history = qa.run_qa_loop(designer_output, max_iterations=args.iterations)
    
    # Save outputs
    output_dir = Path("python_outputs")
    
    # Save QA result
    qa_output_file = output_dir / f"alt3_{args.timestamp}_2_5_qa_validated.json"
    with open(qa_output_file, 'w') as f:
        json.dump(fixed_json, f, indent=2)
    print(f"💾 Saved QA output to {qa_output_file}")
    
    # Save QA history
    history_file = output_dir / f"alt3_{args.timestamp}_2_5_qa_history.json"
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)
    print(f"📝 Saved QA history to {history_file}")
    
    # Save detailed change log for retrospective analysis
    change_log_file = output_dir / f"alt3_{args.timestamp}_2_5_qa_change_log.json"
    qa.save_change_log(history, change_log_file)
    
    if args.verbose and history:
        print("\n📋 QA History Summary:")
        for h in history:
            print(f"  Iteration {h['iteration']}: {len(h['issues'])} issues → {len(h['changes'])} fixes")

if __name__ == "__main__":
    main()