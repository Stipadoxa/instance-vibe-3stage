import json
import os
import glob

def test_visibility_overrides():
    """Test that visibility overrides are properly structured"""
    test_files = glob.glob("figma-ready/figma_ready_*.json")
    
    found_overrides = False
    
    for file_path in test_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    
                # Check for visibility overrides structure
                items = data.get('items', [])
                for item in items:
                    if 'visibilityOverrides' in item:
                        found_overrides = True
                        print(f"✅ Found visibility overrides in {item.get('type', 'unknown')} from {file_path}")
                        for node_id, visible in item['visibilityOverrides'].items():
                            print(f"   - {node_id}: {visible}")
                            
                    if 'iconSwaps' in item:
                        print(f"✅ Found icon swaps in {item.get('type', 'unknown')} from {file_path}")
                        for node_id, icon_name in item['iconSwaps'].items():
                            print(f"   - {node_id}: {icon_name}")
                    
                    # Recursively check nested items
                    if 'items' in item and isinstance(item['items'], list):
                        check_nested_items(item['items'], file_path)
                        
            except json.JSONDecodeError:
                print(f"❌ Failed to parse JSON in {file_path}")
            except Exception as e:
                print(f"❌ Error processing {file_path}: {e}")
    
    if not found_overrides:
        print("ℹ️ No visibility overrides found in recent outputs. Test with visibility-specific requests.")

def check_nested_items(items, file_path):
    """Recursively check nested items for visibility overrides"""
    for item in items:
        if 'visibilityOverrides' in item:
            print(f"✅ Found nested visibility overrides in {item.get('type', 'unknown')} from {file_path}")
            for node_id, visible in item['visibilityOverrides'].items():
                print(f"   - {node_id}: {visible}")
                
        if 'iconSwaps' in item:
            print(f"✅ Found nested icon swaps in {item.get('type', 'unknown')} from {file_path}")
            for node_id, icon_name in item['iconSwaps'].items():
                print(f"   - {node_id}: {icon_name}")
        
        if 'items' in item and isinstance(item['items'], list):
            check_nested_items(item['items'], file_path)

def validate_override_structure():
    """Validate the structure of visibility overrides"""
    test_files = glob.glob("figma-ready/figma_ready_*.json")
    validation_errors = []
    
    for file_path in test_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    
                items = data.get('items', [])
                for item in items:
                    errors = validate_item_overrides(item, file_path)
                    validation_errors.extend(errors)
                    
            except Exception as e:
                validation_errors.append(f"Error processing {file_path}: {e}")
    
    if validation_errors:
        print("\n❌ Validation Errors Found:")
        for error in validation_errors:
            print(f"  - {error}")
    else:
        print("\n✅ All visibility overrides pass validation")

def validate_item_overrides(item, file_path):
    """Validate a single item's visibility overrides"""
    errors = []
    
    if 'visibilityOverrides' in item:
        overrides = item['visibilityOverrides']
        if not isinstance(overrides, dict):
            errors.append(f"{file_path}: visibilityOverrides must be an object")
        else:
            for node_id, visible in overrides.items():
                if not isinstance(visible, bool):
                    errors.append(f"{file_path}: {node_id} visibility value must be boolean")
                if not node_id.replace(':', '').replace(';', '').isdigit():
                    errors.append(f"{file_path}: {node_id} may not be valid node ID format")
    
    if 'iconSwaps' in item:
        swaps = item['iconSwaps']
        if not isinstance(swaps, dict):
            errors.append(f"{file_path}: iconSwaps must be an object")
        else:
            for node_id, icon_name in swaps.items():
                if not isinstance(icon_name, str):
                    errors.append(f"{file_path}: {node_id} icon name must be string")
    
    # Check nested items
    if 'items' in item and isinstance(item['items'], list):
        for nested_item in item['items']:
            errors.extend(validate_item_overrides(nested_item, file_path))
    
    return errors

if __name__ == "__main__":
    print("🔍 Testing Visibility Overrides Implementation")
    print("=" * 50)
    
    test_visibility_overrides()
    validate_override_structure()
    
    print("\n💡 To test visibility overrides:")
    print("1. Update user-request.txt with a test case from test-requests/visibility-test-cases.txt")
    print("2. Run: python3 instance.py alt3")
    print("3. Run: python3 test-validation.py")
    print("4. Check generated JSON for visibilityOverrides and iconSwaps")