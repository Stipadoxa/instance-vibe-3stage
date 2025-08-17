# UXPal Feedback Loop Implementation Guide

## 📋 **Project Setup Overview**

### **Your Current Workflow**
```
Terminal → Python Script → JSON saved to /figma-ready → Manual Copy to Figma → Render → Screenshot to /screenshots
```

### **New Enhanced Workflow**
```
[Same as above] + Review Script → Improved JSON (only if issues found) → Re-render
```

---

## 🎯 **Implementation Plan**

Step 0: Create New Branch 

# Check current branch
git status

# Create and switch to new feature branch
git checkout -b feature/feedback-loop-implementation

# Confirm you're on the new branch
git branch --show-current

### **Step 1: Folder Structure**
```
/Users/stipa/UXPal/
├── figma-ready/                 # Your existing JSON output folder
│   ├── design_latest.json      # Most recent design from Stage 3
│   └── design_improved.json    # Reviewer's improved version (if needed)
│
├── screenshots/                 # Your existing screenshot folder  
│   └── design_latest.png       # Screenshot of rendered design
│
├── reviews/                    # NEW: Review reports folder
│   └── review_[timestamp].txt # Review analysis and decisions
│
├── scripts/                    # Your Python scripts
│   ├── run_pipeline.py        # Your existing 3-stage pipeline
│   ├── design_reviewer.py     # NEW: Review module
│   └── run_review.py          # NEW: Main review script
│
└── prompts/                    # Your prompt files
    ├── analyzer.txt           # Existing
    ├── designer.txt           # Existing
    ├── json_engineer.txt      # Existing
    └── reviewer.txt           # NEW: From project knowledge
```

---

## 📄 **Step 2: Design Reviewer Module**

Save as `/Users/stipa/UXPal/scripts/design_reviewer.py`:

```python
"""
Design Reviewer Module for UXPal
Analyzes screenshots and improves JSON only when issues are found
"""

import json
import base64
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Tuple
from anthropic import Anthropic

class DesignReviewer:
    def __init__(self, api_key: str):
        """Initialize reviewer with Claude client"""
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"
        self.prompt_template = self.load_prompt_template()
        
    def load_prompt_template(self) -> str:
        """Load the reviewer prompt from file"""
        prompt_path = Path("/Users/stipa/UXPal/prompts/reviewer.txt")
        if prompt_path.exists():
            return prompt_path.read_text()
        else:
            # Fallback to embedded prompt if file not found
            return self.get_default_prompt()
    
    def get_default_prompt(self) -> str:
        """Default reviewer prompt if file not found"""
        return """# Design Reviewer - UXPal Quality Assurance

You are a Senior UX/UI Designer reviewing a rendered interface for visual problems.

## REVIEW CONTEXT
- Original Request: {USER_REQUEST}
- Analyzer Output: {ANALYZER_OUTPUT}
- Design System: {DESIGN_SYSTEM_DATA}
- Designer JSON: {DESIGNER_OUTPUT}

## CRITICAL ISSUES TO CHECK (Fix These):
1. Content cut off or cropped
2. Navigation bars with gaps from screen edges
3. Poor text contrast (light gray on white)
4. Oversized containers with floating content
5. Mixed button sizes in same row

## OUTPUT RULES:
- If NO issues found, respond with: "DESIGN REVIEW: APPROVED"
- If issues found, respond with: "DESIGN REVIEW: IMPROVEMENTS MADE" and provide improved JSON
- ONLY modify existing JSON structure, don't create new schemas
- Focus on fixing visible problems, not redesigning

When providing improved JSON, format it as:
```json
{
  "type": "layoutContainer",
  ...your improved JSON here...
}
```
"""
    
    def encode_image(self, image_path: Path) -> str:
        """Convert image to base64 for Claude"""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def review_design(self, 
                     json_path: Path,
                     screenshot_path: Path,
                     user_request: str = "",
                     analyzer_output: str = "") -> Dict:
        """
        Main review function - analyzes screenshot and JSON
        
        Returns:
            Dictionary with review results
        """
        print("🔍 Loading design files...")
        
        # Load the original JSON
        with open(json_path, 'r') as f:
            designer_json = json.load(f)
        
        # Check screenshot exists
        if not screenshot_path.exists():
            return {
                "status": "error",
                "message": f"Screenshot not found at: {screenshot_path}"
            }
        
        print("📸 Encoding screenshot...")
        screenshot_base64 = self.encode_image(screenshot_path)
        
        # Load design system if available
        design_system_path = Path("/Users/stipa/UXPal/design_system/components.json")
        if design_system_path.exists():
            with open(design_system_path, 'r') as f:
                design_system = json.load(f)
        else:
            design_system = {"note": "Design system not found"}
        
        # Prepare the review prompt
        review_prompt = self.prompt_template.format(
            USER_REQUEST=user_request or "Not provided",
            ANALYZER_OUTPUT=analyzer_output or "Not provided",
            DESIGN_SYSTEM_DATA=json.dumps(design_system, indent=2)[:5000],  # Limit size
            DESIGNER_OUTPUT=json.dumps(designer_json, indent=2)
        )
        
        print("🤖 Calling Claude for review...")
        
        # Call Claude with image
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=8000,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": review_prompt},
                        {"type": "image", "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": screenshot_base64
                        }}
                    ]
                }]
            )
            
            review_content = response.content[0].text
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Claude API error: {str(e)}"
            }
        
        # Save review report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = Path(f"/Users/stipa/UXPal/reviews/review_{timestamp}.txt")
        report_path.parent.mkdir(exist_ok=True)
        report_path.write_text(review_content)
        print(f"📝 Review saved to: {report_path}")
        
        # Check if improvements were made
        if "IMPROVEMENTS MADE" in review_content:
            print("🔧 Issues found - extracting improved JSON...")
            improved_json = self.extract_json_from_response(review_content)
            
            if improved_json:
                # Save improved version
                improved_path = Path("/Users/stipa/UXPal/figma-ready/design_improved.json")
                with open(improved_path, 'w') as f:
                    json.dump(improved_json, f, indent=2)
                
                print(f"✅ Improved JSON saved to: {improved_path}")
                
                return {
                    "status": "improved",
                    "improved_path": str(improved_path),
                    "report_path": str(report_path),
                    "message": "Issues found and fixed! Improved JSON ready for Figma."
                }
            else:
                return {
                    "status": "error",
                    "message": "Issues found but couldn't extract improved JSON",
                    "report_path": str(report_path)
                }
        
        # Design approved as-is
        print("✅ Design approved - no issues found!")
        return {
            "status": "approved",
            "message": "Design approved as-is - no issues found",
            "report_path": str(report_path)
        }
    
    def extract_json_from_response(self, response: str) -> Optional[Dict]:
        """Extract JSON from Claude's response"""
        try:
            # Find JSON block in response
            start_marker = "```json"
            end_marker = "```"
            
            start_idx = response.find(start_marker)
            if start_idx != -1:
                start_idx += len(start_marker)
                end_idx = response.find(end_marker, start_idx)
                if end_idx != -1:
                    json_str = response[start_idx:end_idx].strip()
                    return json.loads(json_str)
        except Exception as e:
            print(f"⚠️ Failed to extract JSON: {e}")
        
        return None
```

---

## 🚀 **Step 3: Main Review Script**

Save as `/Users/stipa/UXPal/scripts/run_review.py`:

```python
#!/usr/bin/env python3
"""
Main script to run design review after screenshot
Usage: python run_review.py [optional: user_request]
"""

import sys
import os
from pathlib import Path
from design_reviewer import DesignReviewer

def main():
    print("\n" + "="*50)
    print("🎨 UXPal Design Review System")
    print("="*50 + "\n")
    
    # Configuration - SET YOUR API KEY HERE or use environment variable
    API_KEY = os.getenv('ANTHROPIC_API_KEY', 'your-api-key-here')
    
    if API_KEY == 'your-api-key-here':
        print("❌ Please set your Anthropic API key!")
        print("   Edit run_review.py or set ANTHROPIC_API_KEY environment variable")
        return
    
    # File paths
    json_path = Path("/Users/stipa/UXPal/figma-ready/design_latest.json")
    screenshot_path = Path("/Users/stipa/UXPal/screenshots/design_latest.png")
    
    # Check files exist
    if not json_path.exists():
        print(f"❌ JSON not found: {json_path}")
        print("   Make sure to save your Stage 3 output as 'design_latest.json'")
        return
    
    if not screenshot_path.exists():
        print(f"❌ Screenshot not found: {screenshot_path}")
        print("   Please take a screenshot and save as 'design_latest.png'")
        return
    
    # Get optional user request from command line
    user_request = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    
    if user_request:
        print(f"📝 Original request: {user_request}")
    
    # Run reviewer
    print("\n🔍 Starting design review...")
    print("-" * 30)
    
    reviewer = DesignReviewer(api_key=API_KEY)
    
    result = reviewer.review_design(
        json_path=json_path,
        screenshot_path=screenshot_path,
        user_request=user_request
    )
    
    print("-" * 30)
    
    # Display results
    if result["status"] == "improved":
        print("\n✨ REVIEW COMPLETE - Issues Fixed!")
        print(f"📁 Improved JSON: {result['improved_path']}")
        print(f"📄 Review report: {result['report_path']}")
        print("\n📋 Next steps:")
        print("1. Copy improved JSON to Figma plugin")
        print("2. Click 'Render JSON' to see improvements")
        print("3. Compare with original render")
        
    elif result["status"] == "approved":
        print("\n✅ REVIEW COMPLETE - No Issues Found!")
        print("Your design passed all quality checks.")
        print(f"📄 Review report: {result['report_path']}")
        
    else:
        print(f"\n❌ Review failed: {result['message']}")
        if 'report_path' in result:
            print(f"📄 Partial report saved: {result['report_path']}")

if __name__ == "__main__":
    main()
```

---

## 🛠️ **Step 4: Integration with Your Pipeline**

Add this to the end of your existing pipeline script:

```python
# At the end of your existing 3-stage pipeline script, add:

def save_for_review(json_data, user_request=""):
    """Save JSON in standard location for review process"""
    import json
    from pathlib import Path
    
    # Save to standard location
    output_path = Path("/Users/stipa/UXPal/figma-ready/design_latest.json")
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    print(f"\n📁 JSON saved for review: {output_path}")
    print("\n📋 Next steps:")
    print("1. Copy JSON to Figma plugin and render")
    print("2. Take screenshot and save as: /Users/stipa/UXPal/screenshots/design_latest.png")
    print("3. Run review: python /Users/stipa/UXPal/scripts/run_review.py")
    
    if user_request:
        print(f"   Optional: python run_review.py \"{user_request}\"")

# Call this at the end of your pipeline:
# save_for_review(final_json, user_request)
```

---

## 📚 **Step 5: Reviewer Prompt File**

Save as `/Users/stipa/UXPal/prompts/reviewer.txt`:

Copy the content from the `design-reviewer.txt` file in your project knowledge (the full prompt is already embedded in the code as fallback).

---

## 🎮 **How to Use**

### **Standard Workflow:**

1. **Run your 3-stage pipeline:**
   ```bash
   python run_pipeline.py "Create a checkout flow"
   ```

2. **Copy JSON to Figma and render**
   - Copy from: `/Users/stipa/UXPal/figma-ready/design_latest.json`
   - Paste in Figma plugin
   - Click render

3. **Take screenshot**
   - Screenshot the rendered design
   - Save as: `/Users/stipa/UXPal/screenshots/design_latest.png`

4. **Run review (only finds issues when needed):**
   ```bash
   cd /Users/stipa/UXPal/scripts
   python run_review.py "Create a checkout flow"
   ```
   Or without the original request:
   ```bash
   python run_review.py
   ```

5. **If issues found:**
   - Copy improved JSON from: `/Users/stipa/UXPal/figma-ready/design_improved.json`
   - Render in Figma to see improvements

### **Quick Test:**

```bash
# Test with a simple design that might have issues
python run_pipeline.py "Create a login screen with navigation bar"
# ... render and screenshot ...
python run_review.py "Create a login screen with navigation bar"
```

---

## 🔧 **Environment Setup**

### **One-time setup:**

```bash
# Create required folders
mkdir -p /Users/stipa/UXPal/reviews
mkdir -p /Users/stipa/UXPal/prompts
mkdir -p /Users/stipa/UXPal/scripts

# Install required package (if not already installed)
pip3 install anthropic

# Set API key (optional - can also hardcode in script)
export ANTHROPIC_API_KEY="your-actual-api-key"
```

### **Make review script executable (optional):**

```bash
chmod +x /Users/stipa/UXPal/scripts/run_review.py
```

---

## 🛡️ **Safety Features**

1. **Only creates improved JSON when issues are found** - no unnecessary files
2. **Never overwrites originals** - always saves as new file
3. **Clear error messages** - tells you exactly what's missing
4. **Standalone operation** - doesn't interfere with your existing pipeline
5. **Simple file naming** - `design_latest.json` and `design_latest.png` for easy workflow

---

## 📊 **Tracking Quality Improvements**

After running several reviews, you can analyze patterns:

```bash
# See all reviews
ls -la /Users/stipa/UXPal/reviews/

# Count approved vs improved
grep -l "APPROVED" /Users/stipa/UXPal/reviews/*.txt | wc -l
grep -l "IMPROVEMENTS MADE" /Users/stipa/UXPal/reviews/*.txt | wc -l

# See common issues
grep "Issues Identified" /Users/stipa/UXPal/reviews/*.txt
```

---

## ⚡ **Quick Reference Card**

```bash
# Your complete workflow
python run_pipeline.py "Your design request"     # Generate JSON
# → Copy to Figma → Render → Screenshot
python run_review.py "Your design request"        # Review & improve if needed
# → If improved: Copy new JSON to Figma → Render
```

---

## 🎯 **Success Indicators**

- ✅ Review runs in < 10 seconds
- ✅ Only generates improved JSON when real issues exist
- ✅ Review reports clearly explain what was fixed
- ✅ Improved designs render correctly in Figma
- ✅ Common issues (navigation gaps, cut-off content) are consistently caught

---

## 🐛 **Troubleshooting**

**"API key not found"**
- Edit `run_review.py` and add your key, or:
- `export ANTHROPIC_API_KEY="sk-ant-..."`

**"Screenshot not found"**
- Ensure screenshot is saved as: `/Users/stipa/UXPal/screenshots/design_latest.png`

**"JSON extraction failed"**
- Check the review report in `/Users/stipa/UXPal/reviews/` for Claude's full response

**"No improvements needed" (when there clearly are issues)**
- Check that screenshot is clear and complete
- Ensure the reviewer prompt file exists and contains the full prompt
