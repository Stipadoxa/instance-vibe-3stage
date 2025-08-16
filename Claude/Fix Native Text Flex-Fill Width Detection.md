Fix Native Text Flex-Fill Width Detection
🎯 Objective
Fix the native-text flex-fill system in figma-renderer.ts so text elements properly detect width constraints in adaptive layouts and use FILL sizing instead of falling back to HUG.
📋 Pre-Execution Checklist
Before starting, confirm you have:

 Access to /src/core/figma-renderer.ts file
 Backup of the current file (create figma-renderer.backup.ts)
 Test JSON file with _useFlexFill: true text elements (like figma_ready_20250815_185655.json)

🔧 Step-by-Step Implementation
Step 1: Locate the calculateEffectiveWidth Method
File: /src/core/figma-renderer.ts
Current Location: Around line 756-780 (search for calculateEffectiveWidth)
Find this exact method signature:
typescriptprivate static calculateEffectiveWidth(container: FrameNode): number | null {
Step 2: Replace the Entire Method
Action: DELETE the entire existing calculateEffectiveWidth method and REPLACE with this enhanced version:
typescript/**
 * Calculate effective width constraint from parent chain
 * Enhanced to handle FILL containers and metadata from JSON Engineer
 * Walks up the layout hierarchy to find actual width limits
 */
private static calculateEffectiveWidth(container: FrameNode): number | null {
  console.log('🧮 Calculating effective width for:', container.name);
  
  let current: FrameNode | null = container;
  let level = 0;
  
  while (current && level < 10) { // Prevent infinite loops
    console.log(`  Level ${level}: ${current.name} (${current.layoutMode || 'no-layout'})`);
    
    // Case 1: Root container with explicit fixed width
    if (current.primaryAxisSizingMode === 'FIXED' && 
        current.counterAxisSizingMode === 'FIXED' && 
        current.width > 0) {
      const rootWidth = current.width;
      console.log(`  ✅ Case 1 - Found root width: ${rootWidth}px`);
      return rootWidth;
    }
    
    // Case 2: Container with actual width (any container that has width set)
    if (current.width > 0) {
      const constrainedWidth = current.width - 
        (current.paddingLeft || 0) - 
        (current.paddingRight || 0);
      console.log(`  ✅ Case 2 - Found container width: ${current.width}px, usable: ${constrainedWidth}px`);
      return Math.max(constrainedWidth, 100); // Minimum 100px
    }
    
    // Case 3: NEW - Check for _effectiveWidth metadata from JSON Engineer
    // This metadata is added during JSON processing to help with width calculation
    if ((current as any)._effectiveWidth) {
      const metadataWidth = (current as any)._effectiveWidth;
      console.log(`  ✅ Case 3 - Found _effectiveWidth metadata: ${metadataWidth}px`);
      return metadataWidth;
    }
    
    // Case 4: NEW - FILL container inside VERTICAL parent
    // This is the critical fix for adaptive layouts
    const parent = current.parent;
    if (parent && parent.type === 'FRAME') {
      const parentFrame = parent as FrameNode;
      
      // Check if this container is FILL inside a VERTICAL parent
      if (parentFrame.layoutMode === 'VERTICAL' && 
          current.layoutMode !== undefined) { // Current has layout (is a container)
        
        console.log(`  🔍 Case 4 - Checking FILL in VERTICAL parent`);
        console.log(`    Parent: ${parentFrame.name}, layout: VERTICAL`);
        console.log(`    Current horizontalSizing: ${(current as any).horizontalSizing || 'not-set'}`);
        
        // If parent is VERTICAL, this container should inherit parent's width
        // Try to get parent's effective width recursively
        const parentWidth = this.calculateEffectiveWidth(parentFrame);
        if (parentWidth) {
          // Account for parent's padding when calculating available width
          const availableWidth = parentWidth - 
            (parentFrame.paddingLeft || 0) - 
            (parentFrame.paddingRight || 0);
          console.log(`  ✅ Case 4 - Inherited from VERTICAL parent: ${parentWidth}px, available: ${availableWidth}px`);
          return Math.max(availableWidth, 100);
        }
      }
      
      // Case 5: NEW - Check if parent has any width constraint we can use
      if (parentFrame.layoutMode === 'HORIZONTAL' && parentFrame.width > 0) {
        // HORIZONTAL parent with fixed width also constrains children
        const parentWidth = parentFrame.width - 
          (parentFrame.paddingLeft || 0) - 
          (parentFrame.paddingRight || 0);
        console.log(`  ✅ Case 5 - HORIZONTAL parent with width: ${parentWidth}px`);
        return Math.max(parentWidth, 100);
      }
      
      // Move up the parent chain for next iteration
      current = parentFrame;
      level++;
    } else {
      // No more parents to check
      break;
    }
  }
  
  console.log('  ❌ No effective width found in parent chain (reached top or max depth)');
  return null;
}
Step 3: Update the detectWidthConstraint Method
Location: Should be immediately after calculateEffectiveWidth (around line 720-740)
Find and verify this method exists:
typescriptprivate static detectWidthConstraint(container: FrameNode): boolean {
Update the width threshold check (if needed):
typescriptprivate static detectWidthConstraint(container: FrameNode): boolean {
  console.log('🔍 Detecting width constraint for container:', {
    type: container.type,
    layoutMode: container.layoutMode,
    width: container.width,
    name: container.name
  });
  
  // Calculate effective width from parent chain
  const effectiveWidth = this.calculateEffectiveWidth(container);
  
  // Increased threshold to 800 to cover tablets (768px) with padding
  if (effectiveWidth && effectiveWidth <= 800) { // Changed from 450
    console.log('✅ Width constraint detected: Effective width =', effectiveWidth);
    return true;
  }
  
  console.log('❌ No width constraint: Effective width =', effectiveWidth || 'null');
  return false;
}
Step 4: Add Debug Helper Method (Optional but Recommended)
Location: Add after detectWidthConstraint method
typescript/**
 * Debug helper to log the full parent chain for width analysis
 * Useful for troubleshooting width constraint detection issues
 */
private static debugParentChain(container: FrameNode): void {
  console.log('🔍 DEBUG: Parent chain analysis for:', container.name);
  let current: FrameNode | null = container;
  let level = 0;
  
  while (current && level < 10) {
    console.log(`Level ${level}:`, {
      name: current.name,
      type: current.type,
      layoutMode: current.layoutMode || 'none',
      width: current.width,
      horizontalSizing: (current as any).horizontalSizing || 'not-set',
      primaryAxisSizingMode: current.primaryAxisSizingMode || 'not-set',
      counterAxisSizingMode: current.counterAxisSizingMode || 'not-set',
      hasEffectiveWidth: !!(current as any)._effectiveWidth,
      effectiveWidth: (current as any)._effectiveWidth || 'none'
    });
    
    const parent = current.parent;
    if (parent && parent.type === 'FRAME') {
      current = parent as FrameNode;
      level++;
    } else {
      break;
    }
  }
}
Step 5: Optional - Update createTextNode for Better Debugging
Location: In the createTextNode method (around line 800-900)
Find this section:
typescript// FINAL: Enhanced text auto-resize with flex-fill support
const isInConstrainedContainer = this.detectWidthConstraint(container);
Add debug logging after it:
typescript// FINAL: Enhanced text auto-resize with flex-fill support
const isInConstrainedContainer = this.detectWidthConstraint(container);

// Debug: Log decision factors
if (useFlexFill) {
  console.log('📝 Text flex-fill decision:', {
    content: textContent.substring(0, 30) + '...',
    useFlexFill,
    parentLayout,
    isInConstrainedContainer,
    containerName: container.name,
    effectiveWidth: this.calculateEffectiveWidth(container)
  });
  
  // Uncomment for detailed debugging:
  // this.debugParentChain(container);
}
🧪 Testing Instructions
Test Case 1: Basic Adaptive Layout

Load the provided JSON (figma_ready_20250815_185655.json)
Run the Figma plugin
Check console for width detection logs
Verify text elements show "FILL" sizing, not "HUG"

Test Case 2: Nested Containers
Create a test JSON with 3-level nesting:
json{
  "type": "layoutContainer",
  "width": 375,
  "items": [{
    "type": "layoutContainer",
    "horizontalSizing": "FILL",
    "items": [{
      "type": "layoutContainer",
      "horizontalSizing": "FILL",
      "items": [{
        "type": "native-text",
        "_useFlexFill": true,
        "properties": { "content": "Test nested text" }
      }]
    }]
  }]
}
Expected Console Output
You should see logs like:
🧮 Calculating effective width for: Container Name
  Level 0: Container Name (VERTICAL)
  Level 1: Parent Container (VERTICAL)
  ✅ Case 1 - Found root width: 375px
✅ Width constraint detected: Effective width = 375
🚨 Rollback Plan
If something breaks:

Restore from figma-renderer.backup.ts
Report which step caused the issue
Share console error messages

✅ Success Criteria

 Text elements with _useFlexFill: true fill container width
 Console shows "✅ Width constraint detected" for adaptive layouts
 No errors in Figma console
 Text elements display as "FILL" in Figma, not "HUG"
 Works with nested containers (2-3 levels deep)

📝 Post-Implementation Notes
After implementing:

Test with multiple JSON files
Document any edge cases found
Consider adding the debug helper permanently for future troubleshooting
Update JSON Engineer if needed to add _effectiveWidth metadata

This plan provides precise, step-by-step instructions with exact code to replace and clear success criteria. The enhanced solution handles all the edge cases we identified while maintaining backward compatibility.
