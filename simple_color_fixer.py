#!/usr/bin/env python3
"""
Simple Color Name Fixer - Streamlined version

Just run: python simple_color_fixer.py
"""

import json
import re
import glob
from pathlib import Path

def get_color_mapping(design_system_data):
    """Extract color mapping from design system data."""
    mapping = {}
    
    # Number conversion: design system -> semantic
    number_map = {5: 50, 10: 100, 30: 300, 50: 500, 80: 800, 90: 900}
    
    if 'colorStyles' not in design_system_data:
        return mapping
    
    for category, styles in design_system_data['colorStyles'].items():
        for style in styles:
            name = style.get('name', '')
            
            # Extract number from "Primary/primary50" -> 50
            match = re.search(r'/[^0-9]*(\d+)$', name)
            if match:
                design_number = int(match.group(1))
                semantic_number = number_map.get(design_number, design_number * 10)
                
                # Create mapping: "primary-500" -> "Primary/primary50"
                semantic_name = f"{category.lower()}-{semantic_number}"
                mapping[semantic_name] = name
                
    return mapping

def fix_colors_in_object(obj, color_mapping):
    """Recursively fix color names in an object."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str):
                # Check if this looks like a semantic color
                if re.match(r'^(primary|secondary|tertiary|neutral|surface)-\d+$', value.lower()):
                    if value in color_mapping:
                        obj[key] = color_mapping[value]
                        print(f"Fixed: {value} -> {color_mapping[value]}")
            elif isinstance(value, (dict, list)):
                fix_colors_in_object(value, color_mapping)
    elif isinstance(obj, list):
        for item in obj:
            fix_colors_in_object(item, color_mapping)

def main():
    print(">> Simple Color Name Fixer")
    print("-" * 30)
    
    # Find files automatically
    design_files = glob.glob("**/design-system-raw-data-*.json", recursive=True)
    figma_files = glob.glob("**/figma_ready_*.json", recursive=True)
    
    if not design_files:
        print("Error: No design-system-raw-data-*.json found")
        return
    if not figma_files:
        print("Error: No figma_ready_*.json found")  
        return
    
    # Use latest files
    design_file = max(design_files, key=lambda f: Path(f).stat().st_mtime)
    figma_file = max(figma_files, key=lambda f: Path(f).stat().st_mtime)
    
    print(f"Using Design System: {design_file}")
    print(f"Using Figma JSON: {figma_file}")
    
    # Load design system
    with open(design_file, 'r') as f:
        design_data = json.load(f)
    
    # Load figma JSON
    with open(figma_file, 'r') as f:
        figma_data = json.load(f)
    
    # Get color mapping
    color_mapping = get_color_mapping(design_data)
    print(f"Found {len(color_mapping)} color mappings")
    
    # Fix colors
    print("\nApplying fixes:")
    fix_colors_in_object(figma_data, color_mapping)
    
    # Save corrected version
    corrected_file = figma_file.replace('.json', '_corrected.json')
    with open(corrected_file, 'w') as f:
        json.dump(figma_data, f, indent=2)
    
    print(f"\nSaved corrected version: {corrected_file}")

if __name__ == "__main__":
    main()
