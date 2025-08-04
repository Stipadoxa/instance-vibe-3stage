# 🤖 Automated Testing System Implementation Plan
## For Claude Code Execution

## Phase 1: Foundation Setup
### Step 1.1: Create Testing Infrastructure
Create new directory structure:
```
testing/
├── test_requests.py          # Test case definitions
├── batch_runner.py          # Main test execution engine
├── quality_validator.py     # JSON validation logic
├── test_dashboard.py        # Results analysis and reporting
├── results/
│   ├── raw_outputs/
│   ├── reports/
│   └── logs/
└── config/
    └── test_config.json     # Configuration settings
```

### Step 1.2: Define Test Cases
File: `testing/test_requests.py`
```python
TEST_REQUESTS = {
    "test1_login": {
        "name": "Simple Login Screen",
        "complexity": "beginner",
        "request": "Create a login screen for the marketplace app with email and password fields, a login button, and a 'forgot password' link.",
        "success_criteria": {
            "required_components": ["text-field", "button", "appbar"],
            "max_native_elements": 1,
            "required_variants": ["text-field variants for email/password"],
            "layout_structure": "vertical"
        }
    },
    "test2_settings": {
        "name": "Notification Settings",
        "complexity": "intermediate",
        "request": "Design a notification settings page where users can toggle different types of notifications on/off (push notifications, email alerts, SMS updates, promotional offers) with toggle switches and descriptive text for each option.",
        "success_criteria": {
            "required_components": ["list-item", "appbar"],
            "max_native_elements": 2,
            "required_variants": ["list-item with trailing elements"],
            "context_requirements": ["settings icons", "proper variant usage"]
        }
    },
    "test3_product_listing": {
        "name": "Product Search Results",
        "complexity": "intermediate-advanced",
        "request": "Create a product listing page showing search results for electronics, with a search bar at the top, filter button, and a grid of product cards displaying product images, titles, prices, and seller ratings.",
        "success_criteria": {
            "required_components": ["product card", "search-field", "button"],
            "max_native_elements": 3,
            "layout_requirements": ["grid layout handling"],
            "component_combinations": ["search + cards"]
        }
    },
    "test4_product_detail": {
        "name": "Product Detail Page",
        "complexity": "advanced",
        "request": "Design a product detail page for a used laptop listing, showing multiple product photos, title, price, condition details, seller profile with rating, description, and contact seller button.",
        "success_criteria": {
            "required_components": ["appbar", "button", "image"],
            "max_native_elements": 4,
            "context_requirements": ["bookmark icon swap", "visibility overrides"],
            "information_hierarchy": ["multiple text levels"]
        }
    },
    "test5_seller_dashboard": {
        "name": "Seller Dashboard",
        "complexity": "expert",
        "request": "Create a seller dashboard homepage with quick stats cards (total listings, views this week, messages), recent activity feed, and action buttons to create new listing or view all messages, plus bottom navigation.",
        "success_criteria": {
            "required_components": ["card", "button", "bottom navigation"],
            "max_native_elements": 5,
            "complex_requirements": ["dashboard statistics", "multiple card types"],
            "navigation_context": ["dashboard-specific adaptations"]
        }
    }
}
```

## Phase 2: Quality Validation Engine
### Step 2.1: JSON Structure Validator
File: `testing/quality_validator.py`
```python
import json
import os
from typing import Dict, List, Any

class JSONQualityValidator:
    def __init__(self, design_system_path: str):
        self.design_system = self._load_design_system(design_system_path)
        self.valid_components = self._extract_valid_components()

    def validate_output(self, json_file_path: str, test_criteria: Dict) -> Dict:
        """Complete validation of generated JSON against test criteria"""

        # Load and parse JSON
        data = self._load_json_safely(json_file_path)
        if not data:
            return {"valid": False, "critical_error": "Invalid JSON format"}

        issues = []
        warnings = []

        # Structure validation
        issues.extend(self._validate_structure(data))

        # Component validation
        issues.extend(self._validate_components(data))

        # Variant syntax validation
        issues.extend(self._validate_variants(data))

        # Test-specific criteria validation
        warnings.extend(self._validate_test_criteria(data, test_criteria))

        # Native element analysis
        native_count = self._count_native_elements(data)
        if native_count > test_criteria.get("max_native_elements", 3):
            warnings.append(f"High native element usage: {native_count}")

        return {
            "valid": len(issues) == 0,
            "critical_issues": issues,
            "warnings": warnings,
            "metrics": {
                "native_element_count": native_count,
                "component_count": self._count_components(data),
                "layout_depth": self._calculate_layout_depth(data)
            },
            "test_criteria_met": len(warnings) == 0
        }

    def _validate_structure(self, data: Dict) -> List[str]:
        """Validate basic JSON structure requirements"""
        issues = []

        if "layoutContainer" not in data:
            issues.append("Missing required 'layoutContainer'")

        if "items" not in data:
            issues.append("Missing required 'items' array")

        return issues

    def _validate_components(self, data: Dict) -> List[str]:
        """Validate all component references exist in design system"""
        issues = []

        for item in self._extract_all_items(data):
            if item.get("type") and item.get("componentNodeId"):
                if item["componentNodeId"] not in self.valid_components:
                    issues.append(f"Invalid component ID: {item['componentNodeId']}")

        return issues

    def _validate_variants(self, data: Dict) -> List[str]:
        """Validate variant syntax structure"""
        issues = []

        for item in self._extract_all_items(data):
            properties = item.get("properties", {})
            if "variants" in properties:
                # Check variants are in separate object
                variant_obj = properties["variants"]
                if not isinstance(variant_obj, dict):
                    issues.append("Variants must be in object format")

                # Check no variants mixed with regular properties
                for key in properties:
                    if key != "variants" and key.title() in variant_obj:
                        issues.append(f"Variant '{key}' mixed with regular properties")

        return issues

    # Additional helper methods...
```

### Step 2.2: Test Criteria Checker
Add to quality_validator.py:
```python
    def _validate_test_criteria(self, data: Dict, criteria: Dict) -> List[str]:
        """Check test-specific success criteria"""
        warnings = []

        # Check required components present
        found_components = self._get_component_types(data)
        required = criteria.get("required_components", [])
        for component_type in required:
            if component_type not in found_components:
                warnings.append(f"Missing required component type: {component_type}")

        # Check variant usage
        if "required_variants" in criteria:
            variant_usage = self._analyze_variant_usage(data)
            # Add specific variant checks...

        # Check context requirements (icon swaps, visibility overrides)
        if "context_requirements" in criteria:
            context_analysis = self._analyze_context_adaptation(data)
            # Add context-specific checks...

        return warnings
```

## Phase 3: Batch Test Execution Engine
### Step 3.1: Core Test Runner
File: `testing/batch_runner.py`
```python
import subprocess
import json
import os
from datetime import datetime
from typing import Dict, List
from test_requests import TEST_REQUESTS
from quality_validator import JSONQualityValidator

class BatchTestRunner:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.validator = JSONQualityValidator(f"{project_root}/design-system/design-system-raw-data-*.json")
        self.results_dir = f"{project_root}/testing/results"
        self._ensure_directories()

    def run_single_test(self, test_name: str) -> Dict:
        """Execute single test iteration"""

        test_config = TEST_REQUESTS[test_name]
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")

        # Write test request to user-request.txt
        request_file = f"{self.project_root}/user-request.txt"
        with open(request_file, 'w') as f:
            f.write(test_config["request"])

        # Execute pipeline
        process = subprocess.run(
            ['python3', 'instance.py', 'alt3'],
            cwd=self.project_root,
            capture_output=True,
            text=True
        )

        # Find generated output file
        figma_ready_dir = f"{self.project_root}/figma-ready"
        output_files = [f for f in os.listdir(figma_ready_dir) if f.startswith(f"figma_ready_{timestamp[:10]}")]

        if not output_files:
            return {
                "success": False,
                "error": "No output file generated",
                "timestamp": timestamp,
                "test_name": test_name
            }

        latest_output = max(output_files)
        output_path = f"{figma_ready_dir}/{latest_output}"

        # Quality validation
        quality_result = self.validator.validate_output(output_path, test_config["success_criteria"])

        # Copy to results directory for tracking
        result_copy = f"{self.results_dir}/raw_outputs/{test_name}_{timestamp}.json"
        os.system(f"cp '{output_path}' '{result_copy}'")

        return {
            "success": process.returncode == 0,
            "quality_valid": quality_result["valid"],
            "criteria_met": quality_result["test_criteria_met"],
            "timestamp": timestamp,
            "test_name": test_name,
            "output_file": output_path,
            "result_copy": result_copy,
            "quality_report": quality_result,
            "pipeline_output": process.stdout,
            "pipeline_errors": process.stderr
        }

    def run_test_batch(self, test_name: str, target_success_rate: float = 0.8, max_iterations: int = 10) -> Dict:
        """Run test batch with early stopping"""

        print(f"\n🚀  Starting batch test: {TEST_REQUESTS[test_name]['name']}")
        print(f"Target: {int(target_success_rate * 100)}% success rate")

        results = []
        qualified_successes = 0

        for iteration in range(1, max_iterations + 1):
            print(f"\n--- Iteration {iteration}/{max_iterations} ---")

            result = self.run_single_test(test_name)
            results.append(result)

            # Determine if this is a qualified success
            if result["success"] and result["quality_valid"] and result["criteria_met"]:
                qualified_successes += 1
                print(f"✅  Qualified Success ({qualified_successes}/{iteration})")

                # **HUMAN DECISION POINT**
                print(f"\n🤔  MANUAL REVIEW REQUIRED:")
                print(f"👀  Open file in Figma: {result['output_file']}")
                print(f"🧪  Test: {TEST_REQUESTS[test_name]['name']}")

                visual_success = input("Visual review passed? (y/n): ").lower().strip() == 'y'
                result["visual_success"] = visual_success

                if visual_success:
                    current_success_rate = qualified_successes / iteration
                    if current_success_rate >= target_success_rate and qualified_successes >= max_iterations * target_success_rate:
                        print(f"\n🎉  EARLY SUCCESS! Target reached at {iteration} iterations")
                        break
                else:
                    qualified_successes -= 1
                    # Don't count as qualified success
            else:
                print(f"❌  Failed - Reason: {self._get_failure_reason(result)}")

        # Generate batch summary
        final_success_rate = qualified_successes / len(results)
        batch_result = {
            "test_name": test_name,
            "passed": final_success_rate >= target_success_rate,
            "qualified_successes": qualified_successes,
            "total_iterations": len(results),
            "success_rate": final_success_rate,
            "target_rate": target_success_rate,
            "results": results,
            "summary": self._generate_batch_summary(results)
        }

        # Save batch results
        self._save_batch_results(batch_result)

        return batch_result
```

## Phase 4: Results Analysis & Dashboard
### Step 4.1: Test Dashboard
File: `testing/test_dashboard.py`
```python
import json
import pandas as pd
from collections import defaultdict, Counter
from datetime import datetime

class TestingDashboard:
    def __init__(self, results_dir: str):
        self.results_dir = results_dir

    def generate_comprehensive_report(self, batch_results: List[Dict]) -> Dict:
        """Generate detailed analysis across all test batches"""

        # Overall statistics
        overall_stats = self._calculate_overall_stats(batch_results)

        # Failure pattern analysis
        failure_patterns = self._analyze_failure_patterns(batch_results)

        # Component usage analysis
        component_usage = self._analyze_component_usage(batch_results)

        # Progressive difficulty analysis
        difficulty_progression = self._analyze_difficulty_progression(batch_results)

        # Prompt improvement recommendations
        recommendations = self._generate_recommendations(failure_patterns, batch_results)

        report = {
            "generated_at": datetime.now().isoformat(),
            "overall_statistics": overall_stats,
            "failure_patterns": failure_patterns,
            "component_usage_analysis": component_usage,
            "difficulty_progression": difficulty_progression,
            "improvement_recommendations": recommendations,
            "next_actions": self._suggest_next_actions(batch_results)
        }

        # Save report
        report_file = f"{self.results_dir}/reports/comprehensive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        return report

    def _analyze_failure_patterns(self, batch_results: List[Dict]) -> Dict:
        """Identify common failure modes across tests"""

        failure_categories = {
            "component_selection": [],
            "variant_syntax": [],
            "native_overuse": [],
            "layout_structure": [],
            "context_adaptation": [],
            "json_format": []
        }

        for batch in batch_results:
            for result in batch["results"]:
                if not result["success"] or not result["quality_valid"]:
                    # Categorize failure type
                    failure_type = self._categorize_failure(result)
                    failure_categories[failure_type].append({
                        "test": batch["test_name"],
                        "details": result.get("quality_report", {}),
                        "timestamp": result["timestamp"]
                    })

        return {
            category: {
                "count": len(failures),
                "frequency": len(failures) / sum(len(batch["results"]) for batch in batch_results),
                "examples": failures[:3]  # Show top 3 examples
            }
            for category, failures in failure_categories.items()
        }

    def _generate_recommendations(self, failure_patterns: Dict, batch_results: List[Dict]) -> List[Dict]:
        """Generate specific prompt improvement recommendations"""

        recommendations = []

        # High failure rate recommendations
        for category, data in failure_patterns.items():
            if data["frequency"] > 0.3:  # More than 30% failure rate
                recommendations.append({
                    "priority": "HIGH",
                    "category": category,
                    "issue": f"High failure rate in {category} ({data['frequency']:.1%})",
                    "action": self._get_category_fix_action(category),
                    "prompt_section": self._get_prompt_section_to_fix(category)
                })

        # Progressive difficulty recommendations
        success_rates = [batch["success_rate"] for batch in batch_results]
        if len(success_rates) > 1 and success_rates[-1] < success_rates[0]:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "complexity_scaling",
                "issue": "Success rate decreasing with complexity",
                "action": "Review advanced reasoning prompts",
                "prompt_section": "alt2-ux-ui-designer.txt - complex decision making"
            })

        return recommendations
```

## Phase 5: Main Test Orchestrator
### Step 5.1: Master Test Controller
File: `testing/test_orchestrator.py`
```python
from batch_runner import BatchTestRunner
from test_dashboard import TestingDashboard
from test_requests import TEST_REQUESTS

class TestOrchestrator:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.batch_runner = BatchTestRunner(project_root)
        self.dashboard = TestingDashboard(f"{project_root}/testing/results")

    def run_full_test_suite(self, target_success_rate: float = 0.8) -> None:
        """Execute complete testing workflow with human checkpoints"""

        print("🤖  AUTOMATED TESTING SUITE STARTING")
        print("=" * 50)

        all_batch_results = []

        # **HUMAN DECISION POINT**
        test_order = list(TEST_REQUESTS.keys())
        print(f"Planned test sequence: {[TEST_REQUESTS[t]['name'] for t in test_order]}")
        proceed = input("Proceed with full test suite? (y/n): ").lower().strip() == 'y'

        if not proceed:
            print("Test suite cancelled by user")
            return

        for test_name in test_order:
            print(f"\n{'=' * 60}")
            print(f"🧪  TESTING: {TEST_REQUESTS[test_name]['name']}")
            print(f"Complexity: {TEST_REQUESTS[test_name]['complexity']}")
            print(f"{'=' * 60}")

            # **HUMAN DECISION POINT**
            proceed = input(f"Start {test_name}? (y/n/skip): ").lower().strip()
            if proceed == 'n':
                print("Test suite stopped by user")
                break
            elif proceed == 'skip':
                print(f"Skipping {test_name}")
                continue

            # Run test batch
            batch_result = self.batch_runner.run_test_batch(
                test_name,
                target_success_rate=target_success_rate
            )

            all_batch_results.append(batch_result)

            # Show immediate results
            self._display_batch_summary(batch_result)

            # **HUMAN DECISION POINT**
            if not batch_result["passed"]:
                print(f"\n❗   {test_name}  did not meet success criteria")
                action = input("Continue to next test (c), retry this test (r), or stop (s)? ").lower().strip()

                if action == 's':
                    break
                elif action == 'r':
                    # Retry current test
                    print("Retrying...")
                    batch_result = self.batch_runner.run_test_batch(
                        test_name,
                        target_success_rate=target_success_rate
                    )
                    all_batch_results[-1] = batch_result  # Replace last result

            print(f"\n✅  Completed {test_name}")

        # Generate final comprehensive report
        print(f"\n{'=' * 60}")
        print("📊  GENERATING COMPREHENSIVE REPORT")
        print(f"{'=' * 60}")

        final_report = self.dashboard.generate_comprehensive_report(all_batch_results)

        # **HUMAN DECISION POINT**
        print(f"\n📄  Report saved to: testing/results/reports/")
        print("🔍  Key Findings:")
        for rec in final_report["improvement_recommendations"]:
            print(f"  {rec['priority']}: {rec['issue']}")

        print(f"\n🧪  Next Actions:")
        for action in final_report["next_actions"]:
            print(f"  - {action}")

        proceed = input("\nView detailed recommendations? (y/n): ").lower().strip() == 'y'
        if proceed:
            self._display_detailed_recommendations(final_report)

    def run_single_test_debug(self, test_name: str) -> None:
        """Run single test with detailed debugging output"""

        print(f"🤔  DEBUG MODE: {TEST_REQUESTS[test_name]['name']}")

        result = self.batch_runner.run_single_test(test_name)

        print(f"\n📊  Results:")
        print(f"  Pipeline Success: {result['success']}")
        print(f"  Quality Valid: {result['quality_valid']}")
        print(f"  Criteria Met: {result['criteria_met']}")

        if result.get("quality_report"):
            print(f"\n📊  Quality Report:")
            report = result["quality_report"]
            print(f"  Critical Issues: {len(report.get('critical_issues', []))}")
            print(f"  Warnings: {len(report.get('warnings', []))}")
            print(f"  Native Elements: {report.get('metrics', {}).get('native_element_count', 0)}")

        # **HUMAN DECISION POINT**
        if result["success"] and result["quality_valid"]:
            print(f"\n🤔  MANUAL REVIEW REQUIRED:")
            print(f"👀  File: {result['output_file']}")
            input("Press Enter after reviewing in Figma...")
```

## Phase 6: Integration & Configuration
### Step 6.1: Main Entry Point
File: `testing/run_tests.py`
```python
#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from test_orchestrator import TestOrchestrator

def main():
    # Get project root (parent of testing directory)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    orchestrator = TestOrchestrator(project_root)

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "full":
            orchestrator.run_full_test_suite()
        elif command == "debug" and len(sys.argv) > 2:
            test_name = sys.argv[2]
            orchestrator.run_single_test_debug(test_name)
        else:
            print("Usage:")
            print("  python run_tests.py full          # Run complete test suite")
            print("  python run_tests.py debug test1   # Debug single test")
    else:
        # Interactive mode
        print("🤖  Automated Testing System")
        print("1. Run full test suite")
        print("2. Debug single test")

        choice = input("Select option (1/2): ").strip()

        if choice == "1":
            orchestrator.run_full_test_suite()
        elif choice == "2":
            test_name = input("Enter test name (test1_login, test2_settings, etc.): ").strip()
            orchestrator.run_single_test_debug(test_name)

if __name__ == "__main__":
    main()
```

### Step 6.2: Configuration File
File: `testing/config/test_config.json`
```json
{
  "default_settings": {
    "target_success_rate": 0.8,
    "max_iterations_per_test": 10,
    "early_stopping_enabled": true,
    "save_all_outputs": true,
    "verbose_logging": true
  },
  "test_sequence": [
    "test1_login",
    "test2_settings",
    "test3_product_listing",
    "test4_product_detail",
    "test5_seller_dashboard"
  ],
  "quality_thresholds": {
    "max_native_elements_warning": 3,
    "max_layout_depth_warning": 4,
    "required_component_coverage": 0.8
  },
  "output_settings": {
    "save_pipeline_logs": true,
    "save_quality_reports": true,
    "generate_visual_diffs": false
  }
}
```

## Human Decision Points Summary
### During Setup:
- Review test case definitions and success criteria
- Verify project paths and dependencies

### During Test Execution:
1.  **Start of test suite**: Confirm test sequence
2.  **Before each test**: Proceed/skip/stop decision
3.  **Visual validation**: Manual Figma review for each qualified success
4.  **Failed test handling**: Continue/retry/stop decision
5.  **Report review**: Review detailed recommendations

### During Analysis:
- Review failure patterns and recommendations
- Decide on prompt improvement priorities
- Plan next iteration improvements
