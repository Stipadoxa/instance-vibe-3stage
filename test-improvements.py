#!/usr/bin/env python3
"""
UXPal Prompt Improvements Validation Script

This script tests the updated prompts to ensure they prevent common generation errors:
- Invalid native element types
- Percentage width values  
- Missing component variants
- Incorrect property names

Usage: python3 test-improvements.py
"""

import json
import sys
import subprocess
import os
from datetime import datetime

# Test cases that previously caused errors
TEST_CASES = [
    {
        "name": "Grid Layout Test",
        "request": "Create a product grid with 3 columns showing 6 items",
        "should_not_contain": ["native-grid"],
        "should_contain": ["layoutContainer", "layoutWrap"],
        "description": "Should use layoutContainer with wrap, not native-grid"
    },
    {
        "name": "Rating System Test", 
        "request": "Add a 5-star rating display showing 4.5 stars",
        "should_not_contain": ["native-rating"],
        "should_contain": ["star", "component"],
        "description": "Should use star components or shapes, not native-rating"
    },
    {
        "name": "Full Width Test",
        "request": "Make the header full width across the screen",
        "should_not_contain": ["100%", "50%", '"width": "full"'],
        "should_contain": ["horizontalSizing", "FILL"],
        "description": "Should use horizontalSizing: FILL, not percentage widths"
    },
    {
        "name": "Image Gallery Test",
        "request": "Create an image gallery with photo thumbnails", 
        "should_not_contain": ["native-image"],
        "should_contain": ["native-rectangle", "IMAGE"],
        "description": "Should use native-rectangle with image fill, not native-image"
    },
    {
        "name": "Component Variants Test",
        "request": "Add a medium green filled button that says 'Submit'",
        "should_contain": ["componentNodeId", "variants"],
        "should_not_contain": ['"id":', '"text":'],
        "description": "Should use componentNodeId and include all required variants"
    }
]

def run_uxpal_pipeline(request):
    """Run the UXPal pipeline with a test request"""
    # Write test request to file
    with open("user-request.txt", "w") as f:
        f.write(request)
    
    try:
        # Run the alt3 pipeline
        result = subprocess.run(
            ["python3", "instance.py", "alt3"], 
            capture_output=True, 
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"Pipeline error: {result.stderr}")
            return None
            
        # Find the most recent output file
        output_files = [f for f in os.listdir("python_outputs") if f.startswith("alt3_")]
        if not output_files:
            print("No output files found")
            return None
            
        latest_file = sorted(output_files)[-1]
        
        # Read the JSON engineer output (final step)
        json_file = os.path.join("python_outputs", latest_file.replace("_1_user", "_3_json"))
        if os.path.exists(json_file):
            with open(json_file, "r") as f:
                return f.read()
        else:
            print(f"JSON output file not found: {json_file}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Pipeline timeout after 120 seconds")
        return None
    except Exception as e:
        print(f"Pipeline execution error: {e}")
        return None

def validate_output(output, test_case):
    """Validate output against test case requirements"""
    if not output:
        return False, "No output generated"
    
    results = []
    
    # Check should_not_contain patterns
    for pattern in test_case["should_not_contain"]:
        if pattern in output:
            results.append(f"❌ Found forbidden pattern: '{pattern}'")
        else:
            results.append(f"✅ Correctly avoided: '{pattern}'")
    
    # Check should_contain patterns  
    for pattern in test_case["should_contain"]:
        if pattern in output:
            results.append(f"✅ Found required pattern: '{pattern}'")
        else:
            results.append(f"❌ Missing required pattern: '{pattern}'")
    
    # Determine overall success
    failed_checks = [r for r in results if r.startswith("❌")]
    success = len(failed_checks) == 0
    
    return success, results

def main():
    """Run all test cases and report results"""
    print("🧪 UXPal Prompt Improvements Validation")
    print("=" * 50)
    
    total_tests = len(TEST_CASES)
    passed_tests = 0
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"\n[{i}/{total_tests}] {test_case['name']}")
        print(f"Description: {test_case['description']}")
        print(f"Request: {test_case['request']}")
        
        # Run the pipeline
        print("Running pipeline...")
        output = run_uxpal_pipeline(test_case['request'])
        
        if not output:
            print("❌ FAILED: No output generated")
            continue
        
        # Validate output
        success, results = validate_output(output, test_case)
        
        print("Validation Results:")
        for result in results:
            print(f"  {result}")
        
        if success:
            print("🎉 PASSED")
            passed_tests += 1
        else:
            print("💥 FAILED")
            
    # Final report
    print("\n" + "=" * 50)
    print("📊 FINAL RESULTS")
    print(f"Tests Passed: {passed_tests}/{total_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("🏆 ALL TESTS PASSED! Prompt improvements are working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Review the improvements and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()