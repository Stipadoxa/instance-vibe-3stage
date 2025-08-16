import json
import os
from pathlib import Path
from datetime import datetime
import re

class DesignQA:
    def __init__(self, gemini_api_key):
        """Initialize with Gemini API key."""
        self.api_key = gemini_api_key
        # Import here to avoid issues if not installed
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def load_design_system_data(self):
        """Load the newest design system data file."""
        design_system_dir = Path("design-system")
        files = list(design_system_dir.glob("design-system-raw-data-*.json"))
        
        if not files:
            raise FileNotFoundError("No design system files found")
            
        # Sort by timestamp in filename
        newest_file = max(files, key=lambda f: f.stem.split('-data-')[1])
        
        with open(newest_file, 'r') as f:
            return json.load(f)
    
    def load_qa_prompt(self):
        """Load the QA prompt template."""
        prompt_path = Path("src/prompts/roles/alt2-5-design-qa.txt")
        with open(prompt_path, 'r') as f:
            return f.read()
    
    def extract_json_from_designer_output(self, designer_output):
        """
        Extract JSON from designer output that contains rationale + separator + JSON.
        
        Handles formats like:
        - "RATIONALE... ---RATIONALE-SEPARATOR--- {json}"
        - "RATIONALE... ## DESIGN SPECIFICATION {json}"
        - "RATIONALE... ```json {json} ```"
        - Already parsed JSON objects
        """
        if isinstance(designer_output, dict):
            # Already parsed JSON
            return designer_output
            
        if isinstance(designer_output, str):
            # Look for separator patterns
            separators = [
                "---RATIONALE-SEPARATOR---",
                "---JSON-START---",
                "## DESIGN SPECIFICATION",
                "```json"
            ]
            
            json_str = designer_output
            for separator in separators:
                if separator in designer_output:
                    # Take everything after the separator
                    parts = designer_output.split(separator)
                    json_str = parts[-1] if len(parts) > 1 else parts[0]
                    break
            
            # Clean up markdown if present
            json_str = json_str.strip()
            if json_str.startswith("```"):
                # Extract from markdown code block using regex for all cases
                match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', json_str, re.DOTALL)
                if match:
                    json_str = match.group(1).strip()
            
            # Handle "Extra data" issue - extract just the JSON object
            if json_str.startswith('{'):
                # Find the matching closing brace for the main JSON object
                brace_count = 0
                json_end = 0
                for i, char in enumerate(json_str):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                if json_end > 0:
                    json_str = json_str[:json_end]
            
            # Parse JSON
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse JSON from designer output: {e}")
                print(f"🔧 Attempting to fix common JSON issues...")
                
                # Fix common escape sequence issues
                fixed_json_str = self.fix_json_escape_issues(json_str)
                
                try:
                    return json.loads(fixed_json_str)
                except json.JSONDecodeError as e2:
                    print(f"⚠️ Still failed after fixing escapes: {e2}")
                    print(f"📝 Problematic JSON snippet (first 500 chars):")
                    print(f"'{fixed_json_str[:500]}...'")
                    
                    # Try one more time with just the curly braces content
                    match = re.search(r'\{.*\}', fixed_json_str, re.DOTALL)
                    if match:
                        try:
                            return json.loads(match.group(0))
                        except json.JSONDecodeError as e3:
                            print(f"❌ Final attempt failed: {e3}")
                            raise Exception(f"Cannot parse designer JSON output: {e3}")
                    else:
                        raise Exception("No JSON object found in designer output")
        
        return designer_output
    
    def fix_json_escape_issues(self, json_str):
        """Fix common JSON issues that AI models introduce."""
        fixed_str = json_str
        
        # 1. Remove JSON comments (// comments)
        fixed_str = re.sub(r'//.*?(?=\n|$)', '', fixed_str)
        
        # 2. Remove trailing commas before } or ]
        fixed_str = re.sub(r',(\s*[}\]])', r'\1', fixed_str)
        
        # 3. Fix invalid escape sequences in JSON strings
        escape_fixes = [
            (r'\\%', r'%'),           # \% -> %
            (r'\\&', r'&'),           # \& -> &
            (r'\\\$', r'$'),          # \$ -> $
            (r'\\#', r'#'),           # \# -> #
            (r'\\@', r'@'),           # \@ -> @
        ]
        
        for pattern, replacement in escape_fixes:
            fixed_str = re.sub(pattern, replacement, fixed_str)
        
        return fixed_str
    
    def parse_qa_response(self, response_text):
        """Parse the QA response into components."""
        result = {
            'issues': [],
            'fixed_json': None,
            'changes': [],
            'change_log': []
        }
        
        # Split by section markers
        sections = response_text.split('---')
        
        for i, section in enumerate(sections):
            if 'ISSUES-FOUND' in section:
                # Next section has issues
                if i+1 < len(sections):
                    issues_text = sections[i+1].strip()
                    if issues_text != "NONE":
                        result['issues'] = [line.strip() for line in issues_text.split('\n') if line.strip()]
                    
            elif 'FIXED-JSON' in section:
                # Next section has JSON
                if i+1 < len(sections):
                    json_text = sections[i+1].strip()
                    try:
                        result['fixed_json'] = json.loads(json_text)
                    except json.JSONDecodeError:
                        # Try to extract JSON from markdown blocks
                        match = re.search(r'```json\n(.*)\n```', json_text, re.DOTALL)
                        if match:
                            result['fixed_json'] = json.loads(match.group(1))
                        
            elif 'CHANGES-MADE' in section:
                # Next section has changes
                if i+1 < len(sections):
                    changes_text = sections[i+1].strip()
                    if changes_text != "NONE":
                        result['changes'] = [line.strip() for line in changes_text.split('\n') if line.strip()]
                        
            elif 'CHANGE-LOG' in section:
                # Next section has detailed change log
                if i+1 < len(sections):
                    log_text = sections[i+1].strip()
                    if log_text != "NONE":
                        result['change_log'] = [line.strip() for line in log_text.split('\n') if line.strip()]
        
        return result
    
    def run_qa_iteration(self, current_json, fix_history=""):
        """Run a single QA iteration."""
        # Load prompt and data
        prompt_template = self.load_qa_prompt()
        design_system_data = self.load_design_system_data()
        
        # Fill in the prompt
        prompt = prompt_template.replace(
            "{{DESIGN_SYSTEM_DATA}}", 
            json.dumps(design_system_data, indent=2)
        ).replace(
            "{{CURRENT_JSON}}", 
            json.dumps(current_json, indent=2)
        ).replace(
            "{{FIX_HISTORY}}", 
            fix_history if fix_history else "No previous attempts."
        )
        
        # Call Gemini
        response = self.model.generate_content(prompt)
        
        # Parse response
        return self.parse_qa_response(response.text)
    
    def run_qa_loop(self, designer_output_json, max_iterations=3):
        """Run the QA loop with configurable iterations."""
        # Extract JSON from designer output (handles rationale + separator + JSON format)
        current_json = self.extract_json_from_designer_output(designer_output_json)
        
        # If JSON extraction failed, return original input without QA
        if current_json is None:
            print("🚫 Skipping QA validation due to JSON parsing failure")
            return designer_output_json, []
            
        history = []
        change_log = []  # Detailed change tracking
        
        print(f"\n{'='*50}")
        print(f"Starting QA Validation (max {max_iterations} iterations)")
        print(f"{'='*50}")
        
        for iteration in range(max_iterations):
            print(f"\n📋 QA Iteration {iteration + 1}/{max_iterations}")
            
            # Build history string for prompt
            history_text = ""
            if history:
                history_text = "## Previous Attempts:\n"
                for h in history:
                    history_text += f"\n**Iteration {h['iteration']}:**\n"
                    history_text += f"Issues: {', '.join(h['issues']) if h['issues'] else 'None'}\n"
                    history_text += f"Changes: {', '.join(h['changes']) if h['changes'] else 'None'}\n"
            
            # Run QA check
            result = self.run_qa_iteration(current_json, history_text)
            
            # Check if issues found
            if not result['issues']:
                print(f"✅ No issues found! QA passed after {iteration + 1} iteration(s)")
                break
            
            print(f"❌ Found {len(result['issues'])} issue(s):")
            for issue in result['issues']:
                print(f"   - {issue}")
            
            # Update JSON if fixes were made
            if result['fixed_json']:
                current_json = result['fixed_json']
                print(f"✏️  Applied {len(result['changes'])} fix(es)")
            
            # Add to history
            history.append({
                'iteration': iteration + 1,
                'issues': result['issues'],
                'changes': result['changes'],
                'change_log': result.get('change_log', [])
            })
            
            # Check if we're stuck (same issues repeating)
            if len(history) >= 2:
                if history[-1]['issues'] == history[-2]['issues']:
                    print("⚠️  Same issues repeating, stopping QA loop")
                    break
        
        print(f"\n{'='*50}")
        print(f"QA Validation Complete")
        print(f"{'='*50}\n")
        
        return current_json, history
    
    def save_change_log(self, history, output_file):
        """Save detailed change log for retrospective analysis."""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'total_iterations': len(history),
            'total_issues_found': sum(len(h.get('issues', [])) for h in history),
            'total_changes_made': sum(len(h.get('changes', [])) for h in history),
            'iterations': []
        }
        
        for iteration in history:
            iteration_data = {
                'iteration_number': iteration['iteration'],
                'issues_found': len(iteration.get('issues', [])),
                'changes_made': len(iteration.get('changes', [])),
                'issues': iteration.get('issues', []),
                'changes': iteration.get('changes', []),
                'detailed_change_log': iteration.get('change_log', [])
            }
            log_data['iterations'].append(iteration_data)
        
        with open(output_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        print(f"📊 Detailed change log saved: {output_file}")