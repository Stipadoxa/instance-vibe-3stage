"""
Batch Test Runner for UXPal automated testing system.
Executes test cases and collects results with human validation checkpoints.
"""

import subprocess
import json
import os
import glob
from datetime import datetime
from typing import Dict, List
from test_requests import TEST_REQUESTS
from quality_validator import JSONQualityValidator

class BatchTestRunner:
    def __init__(self, project_root: str):
        """Initialize batch runner with project paths."""
        self.project_root = project_root
        self.validator = JSONQualityValidator(f"{project_root}/design-system/design-system-raw-data-*.json")
        self.results_dir = f"{project_root}/testing/results"
        self.figma_ready_dir = f"{project_root}/figma-ready"
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure all required directories exist."""
        os.makedirs(f"{self.results_dir}/raw_outputs", exist_ok=True)
        os.makedirs(f"{self.results_dir}/reports", exist_ok=True)
        os.makedirs(f"{self.results_dir}/logs", exist_ok=True)

    def run_single_test(self, test_name: str) -> Dict:
        """Execute single test iteration."""
        
        if test_name not in TEST_REQUESTS:
            return {
                "success": False,
                "error": f"Unknown test: {test_name}",
                "timestamp": datetime.now().strftime("%Y-%m-%dT%H-%M-%S"),
                "test_name": test_name
            }

        test_config = TEST_REQUESTS[test_name]
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")

        print(f"🔄 Running test: {test_config['name']}")
        print(f"📝 Request: {test_config['request'][:100]}...")

        # Write test request to user-request.txt
        request_file = f"{self.project_root}/user-request.txt"
        try:
            with open(request_file, 'w') as f:
                f.write(test_config["request"])
            print(f"✅ Written request to {request_file}")
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to write request file: {e}",
                "timestamp": timestamp,
                "test_name": test_name
            }

        # Execute pipeline
        print(f"🚀 Executing: python3 instance.py alt3")
        start_time = datetime.now()
        
        try:
            process = subprocess.run(
                ['python3', 'instance.py', 'alt3'],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            execution_time = (datetime.now() - start_time).total_seconds()
            print(f"⏱️  Execution completed in {execution_time:.1f}s")
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Pipeline execution timed out (5 minutes)",
                "timestamp": timestamp,
                "test_name": test_name
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Pipeline execution failed: {e}",
                "timestamp": timestamp,
                "test_name": test_name
            }

        # Find generated output file
        output_file = self._find_latest_output(timestamp)
        if not output_file:
            return {
                "success": False,
                "error": "No output file generated",
                "timestamp": timestamp,
                "test_name": test_name,
                "pipeline_output": process.stdout,
                "pipeline_errors": process.stderr
            }

        print(f"📄 Output file: {output_file}")

        # Quality validation
        quality_result = self.validator.validate_output(output_file, test_config["success_criteria"])
        
        # Copy to results directory for tracking
        result_copy = f"{self.results_dir}/raw_outputs/{test_name}_{timestamp}.json"
        try:
            with open(output_file, 'r') as src, open(result_copy, 'w') as dst:
                dst.write(src.read())
            print(f"📋 Copied result to {result_copy}")
        except Exception as e:
            print(f"⚠️  Failed to copy result: {e}")

        return {
            "success": process.returncode == 0,
            "quality_valid": quality_result["valid"],
            "criteria_met": quality_result["test_criteria_met"],
            "timestamp": timestamp,
            "test_name": test_name,
            "output_file": output_file,
            "result_copy": result_copy,
            "quality_report": quality_result,
            "pipeline_output": process.stdout,
            "pipeline_errors": process.stderr,
            "execution_time": execution_time
        }

    def _find_latest_output(self, timestamp: str) -> str:
        """Find the most recent output file."""
        # Look for files with today's date
        date_prefix = timestamp[:10]  # YYYY-MM-DD
        pattern = f"{self.figma_ready_dir}/figma_ready_{date_prefix}*.json"
        
        files = glob.glob(pattern)
        if files:
            # Return most recent file
            return max(files, key=os.path.getctime)
        
        # Fallback: look for any recent file
        pattern = f"{self.figma_ready_dir}/figma_ready_*.json"
        files = glob.glob(pattern)
        if files:
            # Return most recent file
            return max(files, key=os.path.getctime)
            
        return None

    def run_test_batch(self, test_name: str, target_success_rate: float = 0.8, max_iterations: int = 10) -> Dict:
        """Run test batch with early stopping and human validation."""

        if test_name not in TEST_REQUESTS:
            return {
                "error": f"Unknown test: {test_name}",
                "test_name": test_name,
                "passed": False
            }

        test_config = TEST_REQUESTS[test_name]
        print(f"\n🚀 Starting batch test: {test_config['name']}")
        print(f"🎯 Target: {int(target_success_rate * 100)}% success rate")
        print(f"🔢 Max iterations: {max_iterations}")
        print(f"📋 Complexity: {test_config['complexity']}")

        results = []
        qualified_successes = 0

        for iteration in range(1, max_iterations + 1):
            print(f"\n{'=' * 50}")
            print(f"🧪 Iteration {iteration}/{max_iterations}")
            print(f"{'=' * 50}")

            result = self.run_single_test(test_name)
            results.append(result)

            # Display result
            if result["success"]:
                print(f"✅ Pipeline executed successfully")
                if result["quality_valid"]:
                    print(f"✅ Quality validation passed")
                    if result["criteria_met"]:
                        print(f"✅ Test criteria met")
                        
                        # **HUMAN DECISION POINT**
                        print(f"\n🤔 MANUAL REVIEW REQUIRED:")
                        print(f"👀 Open file in Figma: {result['output_file']}")
                        print(f"🧪 Test: {test_config['name']}")
                        print(f"📝 Request: {test_config['request'][:200]}...")
                        
                        while True:
                            visual_success = input("\n🔍 Visual review passed? (y/n/skip): ").lower().strip()
                            if visual_success in ['y', 'n', 'skip']:
                                break
                            print("Please enter 'y', 'n', or 'skip'")
                        
                        if visual_success == 'skip':
                            print("⏭️  Skipping visual review")
                            result["visual_success"] = None
                        else:
                            result["visual_success"] = (visual_success == 'y')
                            
                            if visual_success == 'y':
                                qualified_successes += 1
                                print(f"🎉 Qualified Success! ({qualified_successes}/{iteration})")
                                
                                # Check early stopping
                                current_success_rate = qualified_successes / iteration
                                if (current_success_rate >= target_success_rate and 
                                    qualified_successes >= max(3, max_iterations * target_success_rate)):
                                    print(f"\n🏁 EARLY SUCCESS! Target reached at {iteration} iterations")
                                    break
                            else:
                                print(f"❌ Visual review failed")
                    else:
                        print(f"⚠️  Test criteria not met: {result['quality_report']['warnings']}")
                else:
                    print(f"❌ Quality validation failed: {result['quality_report']['critical_issues']}")
            else:
                print(f"❌ Pipeline failed: {result.get('error', 'Unknown error')}")

            # Show current stats
            success_rate = qualified_successes / iteration if iteration > 0 else 0
            print(f"\n📊 Current stats: {qualified_successes}/{iteration} ({success_rate:.1%})")

        # Generate batch summary
        final_success_rate = qualified_successes / len(results) if results else 0
        batch_result = {
            "test_name": test_name,
            "passed": final_success_rate >= target_success_rate,
            "qualified_successes": qualified_successes,
            "total_iterations": len(results),
            "success_rate": final_success_rate,
            "target_rate": target_success_rate,
            "results": results,
            "summary": self._generate_batch_summary(results, qualified_successes),
            "timestamp": datetime.now().isoformat()
        }

        # Save batch results
        self._save_batch_results(batch_result)

        return batch_result

    def _generate_batch_summary(self, results: List[Dict], qualified_successes: int) -> Dict:
        """Generate summary statistics for batch results."""
        if not results:
            return {}

        pipeline_successes = sum(1 for r in results if r["success"])
        quality_successes = sum(1 for r in results if r.get("quality_valid", False))
        criteria_successes = sum(1 for r in results if r.get("criteria_met", False))
        
        avg_execution_time = sum(r.get("execution_time", 0) for r in results) / len(results)

        return {
            "pipeline_success_rate": pipeline_successes / len(results),
            "quality_success_rate": quality_successes / len(results),
            "criteria_success_rate": criteria_successes / len(results),
            "visual_success_rate": qualified_successes / len(results),
            "average_execution_time": avg_execution_time,
            "total_failures": len(results) - pipeline_successes,
            "common_errors": self._extract_common_errors(results)
        }

    def _extract_common_errors(self, results: List[Dict]) -> List[str]:
        """Extract common error patterns from failed results."""
        errors = []
        for result in results:
            if not result["success"] and result.get("error"):
                errors.append(result["error"])
            if result.get("quality_report", {}).get("critical_issues"):
                errors.extend(result["quality_report"]["critical_issues"])
        
        # Count occurrences and return most common
        error_counts = {}
        for error in errors:
            error_counts[error] = error_counts.get(error, 0) + 1
        
        return sorted(error_counts.keys(), key=lambda x: error_counts[x], reverse=True)[:5]

    def _save_batch_results(self, batch_result: Dict):
        """Save batch results to file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = f"{self.results_dir}/reports/batch_{batch_result['test_name']}_{timestamp}.json"
        
        try:
            with open(result_file, 'w') as f:
                json.dump(batch_result, f, indent=2)
            print(f"\n💾 Batch results saved to: {result_file}")
        except Exception as e:
            print(f"⚠️  Failed to save batch results: {e}")

    def get_failure_reason(self, result: Dict) -> str:
        """Get human-readable failure reason."""
        if not result["success"]:
            return result.get("error", "Pipeline execution failed")
        elif not result["quality_valid"]:
            issues = result.get("quality_report", {}).get("critical_issues", [])
            return f"Quality validation failed: {issues[0] if issues else 'Unknown'}"
        elif not result["criteria_met"]:
            warnings = result.get("quality_report", {}).get("warnings", [])
            return f"Test criteria not met: {warnings[0] if warnings else 'Unknown'}"
        elif result.get("visual_success") == False:
            return "Visual review failed"
        else:
            return "Unknown failure"