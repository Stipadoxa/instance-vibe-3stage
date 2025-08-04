"""
JSON Quality Validator for UXPal automated testing system.
Validates generated JSON against design system and test criteria.
"""

import json
import os
import glob
from typing import Dict, List, Any, Optional

class JSONQualityValidator:
    def __init__(self, design_system_path: str):
        """Initialize validator with design system data."""
        self.design_system = self._load_design_system(design_system_path)
        self.valid_components = self._extract_valid_components()

    def _load_design_system(self, path_pattern: str) -> Dict:
        """Load design system data from JSON file."""
        try:
            # Handle glob pattern for design system files
            if '*' in path_pattern:
                files = glob.glob(path_pattern)
                if not files:
                    raise FileNotFoundError(f"No design system files found matching: {path_pattern}")
                path = files[0]  # Use first match
            else:
                path = path_pattern
            
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load design system from {path_pattern}: {e}")
            return {}

    def _extract_valid_components(self) -> set:
        """Extract valid component IDs from design system."""
        components = set()
        
        # Look for components in the design system structure
        if isinstance(self.design_system, dict):
            # Check for various possible structures
            for key in ['components', 'data', 'nodes']:
                if key in self.design_system:
                    data = self.design_system[key]
                    if isinstance(data, dict):
                        components.update(data.keys())
                    elif isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and 'id' in item:
                                components.add(item['id'])
        
        return components

    def validate_output(self, json_file_path: str, test_criteria: Dict) -> Dict:
        """Complete validation of generated JSON against test criteria."""
        
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

    def _load_json_safely(self, file_path: str) -> Optional[Dict]:
        """Safely load JSON file with error handling."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error loading JSON from {file_path}: {e}")
            return None

    def _validate_structure(self, data: Dict) -> List[str]:
        """Validate basic JSON structure requirements."""
        issues = []

        if not isinstance(data, dict):
            issues.append("Root must be a JSON object")
            return issues

        if "layoutContainer" not in data:
            issues.append("Missing required 'layoutContainer'")

        if "items" not in data:
            issues.append("Missing required 'items' array")
        elif not isinstance(data["items"], list):
            issues.append("'items' must be an array")

        return issues

    def _validate_components(self, data: Dict) -> List[str]:
        """Validate all component references exist in design system."""
        issues = []

        # Skip validation if no design system loaded
        if not self.valid_components:
            return issues

        for item in self._extract_all_items(data):
            if item.get("type") == "component" and item.get("componentNodeId"):
                component_id = item["componentNodeId"]
                if component_id not in self.valid_components:
                    issues.append(f"Invalid component ID: {component_id}")

        return issues

    def _validate_variants(self, data: Dict) -> List[str]:
        """Validate variant syntax structure."""
        issues = []

        for item in self._extract_all_items(data):
            properties = item.get("properties", {})
            if "variants" in properties:
                # Check variants are in separate object
                variant_obj = properties["variants"]
                if not isinstance(variant_obj, dict):
                    issues.append("Variants must be in object format")
                    continue

                # Check no variants mixed with regular properties
                for key in properties:
                    if key != "variants" and key.title() in variant_obj:
                        issues.append(f"Variant '{key}' mixed with regular properties")

        return issues

    def _validate_test_criteria(self, data: Dict, criteria: Dict) -> List[str]:
        """Check test-specific success criteria."""
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
            for required_variant in criteria["required_variants"]:
                if not any(required_variant.lower() in str(usage).lower() for usage in variant_usage):
                    warnings.append(f"Missing required variant pattern: {required_variant}")

        # Check context requirements (icon swaps, visibility overrides)
        if "context_requirements" in criteria:
            for requirement in criteria["context_requirements"]:
                if not self._check_context_requirement(data, requirement):
                    warnings.append(f"Missing context requirement: {requirement}")

        return warnings

    def _extract_all_items(self, data: Dict) -> List[Dict]:
        """Recursively extract all items from the JSON structure."""
        items = []
        
        def extract_recursive(obj):
            if isinstance(obj, dict):
                if "type" in obj:  # This looks like an item
                    items.append(obj)
                if "items" in obj and isinstance(obj["items"], list):
                    for item in obj["items"]:
                        extract_recursive(item)
                # Also check other possible nested structures
                for value in obj.values():
                    if isinstance(value, (dict, list)):
                        extract_recursive(value)
            elif isinstance(obj, list):
                for item in obj:
                    extract_recursive(item)
        
        extract_recursive(data)
        return items

    def _count_native_elements(self, data: Dict) -> int:
        """Count native elements (non-component items)."""
        count = 0
        for item in self._extract_all_items(data):
            if item.get("type") and item.get("type") != "component":
                count += 1
        return count

    def _count_components(self, data: Dict) -> int:
        """Count component instances."""
        count = 0
        for item in self._extract_all_items(data):
            if item.get("type") == "component":
                count += 1
        return count

    def _calculate_layout_depth(self, data: Dict) -> int:
        """Calculate maximum nesting depth of layout structure."""
        def get_depth(obj, current_depth=0):
            if isinstance(obj, dict):
                if "items" in obj and isinstance(obj["items"], list):
                    if not obj["items"]:  # Empty items list
                        return current_depth
                    return max(get_depth(item, current_depth + 1) for item in obj["items"])
                return current_depth
            return current_depth
        
        return get_depth(data)

    def _get_component_types(self, data: Dict) -> List[str]:
        """Extract component types/names from the data."""
        types = []
        for item in self._extract_all_items(data):
            if item.get("type") == "component":
                # Try to extract component type from various possible fields
                component_id = item.get("componentNodeId", "")
                if "text-field" in component_id.lower():
                    types.append("text-field")
                elif "button" in component_id.lower():
                    types.append("button")
                elif "appbar" in component_id.lower():
                    types.append("appbar")
                elif "list-item" in component_id.lower():
                    types.append("list-item")
                elif "card" in component_id.lower():
                    types.append("card")
                elif "search" in component_id.lower():
                    types.append("search-field")
                elif "image" in component_id.lower():
                    types.append("image")
                elif "navigation" in component_id.lower():
                    types.append("bottom navigation")
                # Add more component type detection as needed
        
        return types

    def _analyze_variant_usage(self, data: Dict) -> List[str]:
        """Analyze variant usage patterns in the data."""
        variants = []
        for item in self._extract_all_items(data):
            properties = item.get("properties", {})
            if "variants" in properties:
                variant_obj = properties["variants"]
                if isinstance(variant_obj, dict):
                    variants.extend(variant_obj.keys())
        
        return variants

    def _check_context_requirement(self, data: Dict, requirement: str) -> bool:
        """Check if a specific context requirement is met."""
        requirement_lower = requirement.lower()
        
        # Convert data to string for pattern matching
        data_str = json.dumps(data).lower()
        
        if "icon" in requirement_lower:
            return "icon" in data_str or "swap" in data_str
        elif "visibility" in requirement_lower:
            return "visibility" in data_str or "visible" in data_str
        elif "variant" in requirement_lower:
            return "variants" in data_str
        
        # Default: check if requirement term appears anywhere in the data
        return requirement_lower in data_str