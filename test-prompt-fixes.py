#!/usr/bin/env python3
"""
UXPal Prompt Fixes Validation Script

This script validates that the critical fixes prevent renderer crashes:
Priority 1: Nested textStyle objects and root container padding issues
Priority 2: Enhanced constraint validation 
Priority 3: Overall system stability improvements

Usage: python3 test-prompt-fixes.py
"""

import json
import sys
import subprocess
import os
import re
from datetime import datetime

# Test cases focusing on crash-prevention fixes
CRASH_PREVENTION_TESTS = [
    {
        "name": "Root Container Padding Test",
        "request": "Create a simple login screen with email field",
        "validation_type": "structure",
        "must_have_patterns": [
            '"paddingTop": 0',
            '"paddingBottom": 0', 
            '"paddingLeft": 0',
            '"paddingRight": 0'
        ],
        "must_not_have_patterns": [
            '"paddingTop": [^0]',
            '"paddingBottom": [^0]',
            '"paddingLeft": [^0]',
            '"paddingRight": [^0]'
        ],
        "description": "Root container must have all padding set to 0 to prevent crashes"
    },
    {
        "name": "TextStyle String Validation",
        "request": "Create a profile page with user name and bio text",
        "validation_type": "properties", 
        "must_have_patterns": [
            '"textStyle": "[^"]*"'  # textStyle must be string
        ],
        "must_not_have_patterns": [
            '"textStyle": {',  # No nested objects
            '"textStyle": \\['  # No arrays
        ],
        "description": "textStyle must be string only, no nested objects to prevent crashes"
    },
    {
        "name": "Component TextStyle Prevention",
        "request": "Create a page with buttons and text labels",
        "validation_type": "components",
        "must_not_have_patterns": [
            '"type": "component"[^}]*"textStyle"'  # Components should not have textStyle
        ],
        "description": "Components must not have textStyle property to prevent crashes"
    },
    {
        "name": "Native Element Constraint Test",
        "request": "Create a photo gallery grid layout",
        "validation_type": "elements",
        "must_not_have_patterns": [
            '"type": "native-grid"',
            '"type": "native-image"',
            '"type": "native-rating"',
            '"type": "native-list-item"'
        ],
        "must_have_patterns": [
            '"type": "layoutContainer"',
            '"layoutWrap": "WRAP"'
        ],
        "description": "Must use only supported native elements and proper layout patterns"
    },
    {
        "name": "Percentage Width Prevention",
        "request": "Make a full-width header with two half-width sections",
        "validation_type": "sizing",
        "must_not_have_patterns": [
            '"width": "100%"',
            '"width": "50%"',
            '"width": "[0-9]*%"'
        ],
        "must_have_patterns": [
            '"horizontalSizing": "FILL"'
        ],
        "description": "Must use horizontalSizing FILL instead of percentage widths"
    }
]

def run_uxpal_pipeline(request):
    """Run the UXPal pipeline and return the JSON engineer output"""
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
            
        # Find the most recent JSON engineer output
        output_files = [f for f in os.listdir("python_outputs") if f.startswith("alt3_")]
        if not output_files:
            print("No output files found")
            return None
            
        latest_timestamp = max(f.split('_')[1] for f in output_files)
        json_file = f"python_outputs/alt3_{latest_timestamp}_3_json_engineer.json"
        
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

def validate_json_structure(json_content):
    """Validate that the JSON can be parsed and has correct structure"""
    try:
        data = json.loads(json_content)
        
        # Check for required root structure
        if "layoutContainer" not in data:
            return False, "Missing layoutContainer at root level"
            
        if "items" not in data:
            return False, "Missing items array at root level"
            
        # Check if items are nested inside layoutContainer (fatal error)
        if "items" in data["layoutContainer"]:
            return False, "FATAL: items found inside layoutContainer (will crash renderer)"
            
        return True, "JSON structure is valid"
        
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"

def validate_crash_prevention(output, test_case):
    """Validate output against crash prevention requirements"""
    if not output:
        return False, ["No output generated"]
    
    results = []
    
    # First validate JSON structure
    is_valid_json, json_message = validate_json_structure(output)
    if not is_valid_json:
        results.append(f"❌ CRITICAL: {json_message}")
        return False, results
    else:
        results.append(f"✅ JSON structure is valid")
    
    # Check must_have_patterns
    if "must_have_patterns" in test_case:
        for pattern in test_case["must_have_patterns"]:
            if re.search(pattern, output):
                results.append(f"✅ Found required pattern: {pattern}")
            else:
                results.append(f"❌ Missing required pattern: {pattern}")
    
    # Check must_not_have_patterns (critical for crash prevention)
    if "must_not_have_patterns" in test_case:
        for pattern in test_case["must_not_have_patterns"]:
            if re.search(pattern, output):
                results.append(f"❌ CRITICAL: Found forbidden pattern: {pattern}")
            else:
                results.append(f"✅ Correctly avoided: {pattern}")
    
    # Determine success - any critical failures mean overall failure
    critical_failures = [r for r in results if "❌ CRITICAL" in r or "❌" in r]
    success = len(critical_failures) == 0
    
    return success, results

def main():
    """Run all crash prevention tests and report results"""
    print("🔧 UXPal Prompt Fixes Validation - Crash Prevention Focus")
    print("=" * 60)
    
    total_tests = len(CRASH_PREVENTION_TESTS)
    passed_tests = 0
    critical_issues = []
    
    for i, test_case in enumerate(CRASH_PREVENTION_TESTS, 1):
        print(f"\n[{i}/{total_tests}] {test_case['name']}")
        print(f"Type: {test_case['validation_type']}")
        print(f"Description: {test_case['description']}")
        print(f"Request: {test_case['request']}")
        
        # Run the pipeline
        print("⚙️  Running pipeline...")
        output = run_uxpal_pipeline(test_case['request'])
        
        if not output:
            print("❌ FAILED: No output generated")
            critical_issues.append(f"{test_case['name']}: No output generated")
            continue
        
        # Validate for crash prevention
        success, results = validate_crash_prevention(output, test_case)
        
        print("🔍 Validation Results:")
        for result in results:
            print(f"  {result}")
            if "❌ CRITICAL" in result:
                critical_issues.append(f"{test_case['name']}: {result}")
        
        if success:
            print("🎉 PASSED - No crash risks detected")
            passed_tests += 1
        else:
            print("💥 FAILED - Potential crash risks found")
            
    # Final report
    print("\n" + "=" * 60)
    print("📊 CRASH PREVENTION VALIDATION RESULTS")
    print(f"Tests Passed: {passed_tests}/{total_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if critical_issues:
        print(f"\n⚠️  CRITICAL ISSUES FOUND ({len(critical_issues)}):")
        for issue in critical_issues:
            print(f"  • {issue}")
    
    if passed_tests == total_tests:
        print("🏆 ALL CRASH PREVENTION TESTS PASSED!")
        print("✅ The prompt fixes are working correctly - renderer crashes should be prevented.")
        sys.exit(0)
    else:
        print("🚨 SOME CRASH PREVENTION TESTS FAILED!")
        print("❌ Review the fixes and address critical issues before deployment.")
        sys.exit(1)

def test_specific_case(test_name=None):
    """Run a specific test case by name"""
    if test_name:
        test_case = next((t for t in CRASH_PREVENTION_TESTS if t["name"] == test_name), None)
        if test_case:
            print(f"Running specific test: {test_name}")
            output = run_uxpal_pipeline(test_case['request'])
            if output:
                success, results = validate_crash_prevention(output, test_case)
                for result in results:
                    print(result)
                print("✅ PASSED" if success else "❌ FAILED")
            else:
                print("❌ No output generated")
        else:
            print(f"Test '{test_name}' not found")
            print("Available tests:")
            for test in CRASH_PREVENTION_TESTS:
                print(f"  - {test['name']}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_specific_case(sys.argv[1])
    else:
        main()