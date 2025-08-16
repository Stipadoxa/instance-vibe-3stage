#!/usr/bin/env python3
"""
Validates that all native-text elements have proper flex-fill metadata.
Run after JSON Engineer stage to verify compliance.
"""

import json
import sys
from pathlib import Path

def validate_text_elements(json_file):
    """Check all native-text elements for proper metadata."""
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    errors = []
    
    def check_element(element, path="root"):
        if element.get("type") == "native-text":
            # Check for required metadata
            if not element.get("_useFlexFill"):
                errors.append(f"{path}: Missing _useFlexFill: true")
            if not element.get("_parentLayout"):
                errors.append(f"{path}: Missing _parentLayout")
            if "_constraintWidth" in element:
                errors.append(f"{path}: Has forbidden _constraintWidth")
        
        # Recurse into items
        if "items" in element:
            for i, item in enumerate(element["items"]):
                check_element(item, f"{path}.items[{i}]")
    
    check_element(data)
    
    if errors:
        print("❌ Text validation FAILED:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print("✅ All native-text elements have proper flex-fill metadata")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_text_metadata.py <json_file>")
        sys.exit(1)
    
    json_file = Path(sys.argv[1])
    if not json_file.exists():
        print(f"Error: {json_file} not found")
        sys.exit(1)
    
    success = validate_text_elements(json_file)
    sys.exit(0 if success else 1)