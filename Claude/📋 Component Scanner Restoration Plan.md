📋 Component Scanner Restoration Plan for Claude Code Agent
OBJECTIVE
Restore text layer scanning functionality in component-scanner.ts to fix text assignment issues while maintaining reasonable performance.
FILE TO MODIFY
src/core/component-scanner.ts

Step 1: Re-enable Text Analysis Method Calls
LOCATE the analyzeComponent method (around line 1064)
FIND these commented lines:
typescript// DEPRECATED: Heavy methods disabled for optimization
// const textLayers = this.findTextLayers(comp);
// const textHierarchy = await this.analyzeTextHierarchy(comp);
// const componentInstances = await this.findComponentInstances(comp);
// const vectorNodes = this.findVectorNodes(comp);
// const imageNodes = this.findImageNodes(comp);
UNCOMMENT only these two lines (keep the others commented for now):
typescript// DEPRECATED: Heavy methods disabled for optimization
const textLayers = this.findTextLayers(comp);
const textHierarchy = await this.analyzeTextHierarchy(comp);
// const componentInstances = await this.findComponentInstances(comp);
// const vectorNodes = this.findVectorNodes(comp);
// const imageNodes = this.findImageNodes(comp);

Step 2: Update the Return Statement
LOCATE the return statement in the same analyzeComponent method (around line 1144)
FIND this section:
typescriptreturn {
    id: comp.id,
    name,
    suggestedType,
    confidence,
    isFromLibrary: false,
    variants: variants,
    variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : undefined,
    textLayers: undefined, // DEPRECATED: Disabled for optimization
    textHierarchy: undefined, // DEPRECATED: Disabled for optimization
    componentInstances: undefined, // DEPRECATED: Disabled for optimization
    vectorNodes: undefined, // DEPRECATED: Disabled for optimization
    imageNodes: undefined, // DEPRECATED: Disabled for optimization
REPLACE the textLayers and textHierarchy lines with:
typescriptreturn {
    id: comp.id,
    name,
    suggestedType,
    confidence,
    isFromLibrary: false,
    variants: variants,
    variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : undefined,
    textLayers: textLayers.length > 0 ? textLayers : undefined,
    textHierarchy: textHierarchy.length > 0 ? textHierarchy : undefined,
    componentInstances: undefined, // DEPRECATED: Disabled for optimization
    vectorNodes: undefined, // DEPRECATED: Disabled for optimization
    imageNodes: undefined, // DEPRECATED: Disabled for optimization

Step 3: Optimize the analyzeTextHierarchy Method
LOCATE the analyzeTextHierarchy method (around line 1290)
FIND the section where it tries to read characters (around line 1320):
typescriptconst characters = textNode.characters || '[empty]';
REPLACE with a simpler version to improve performance:
typescript// Skip reading actual characters for performance
const characters = '[text content]';
RATIONALE: Reading character content is expensive and not needed for text property mapping.

Step 4: Optimize the findTextLayers Method
LOCATE the findTextLayers method (around line 1256)
FIND the section that logs text content (around line 1273):
typescripttry {
    const chars = textNode.characters || '[empty]';
    console.log(`🔍 Found text layer: "${textNode.name}" with content: "${chars}"`);
} catch (charError) {
    console.log(`🔍 Found text layer: "${textNode.name}" (could not read characters)`);
}
REPLACE with simpler logging:
typescript// Simplified logging without reading characters
console.log(`🔍 Found text layer: "${textNode.name}"`);

Step 5: Add Performance Guard
LOCATE the top of the analyzeComponent method (after the method signature)
ADD this performance guard as the first line in the method:
typescriptstatic async analyzeComponent(comp: ComponentNode | ComponentSetNode): Promise<ComponentInfo> {
    // Performance guard: Skip overly complex components
    if (comp.type === 'COMPONENT_SET' && comp.children.length > 50) {
        console.warn(`⚠️ Skipping detailed analysis for complex component set "${comp.name}" with ${comp.children.length} variants`);
        // Return minimal info for very complex components
        return this.analyzeComponentOptimized(comp);
    }
    
    // ... rest of existing code

Step 6: Verify No Breaking Changes
ENSURE these methods still exist and are NOT modified:

findTextLayers() method (should be intact around line 1256)
analyzeTextHierarchy() method (should be intact around line 1290)
These methods should already be fully implemented, just need the optimizations from Steps 3-4


VALIDATION CHECKLIST
After making changes, verify:
✅ textLayers is being populated in the return statement (not undefined)
✅ textHierarchy is being populated in the return statement (not undefined)
✅ The methods findTextLayers() and analyzeTextHierarchy() are being called
✅ No TypeScript errors are introduced
✅ Console logs show "Found text layer" messages when scanning

TESTING INSTRUCTION
After implementation:

The file should compile without errors
When running component scan in Figma, you should see console logs like:

🔍 Found text layer: "headline"
🔍 Found text layer: "Supporting text"


The generated design-system-raw-data-*.json should contain textLayers and textHierarchy data


IMPORTANT NOTES FOR CLAUDE CODE

DO NOT delete or modify the actual method implementations
DO NOT uncomment componentInstances, vectorNodes, or imageNodes (keep them disabled for performance)
DO NOT change method signatures
PRESERVE all existing error handling try/catch blocks
MAINTAIN the existing indentation and code style

This plan will restore the essential text mapping functionality while keeping performance optimizations in place.
