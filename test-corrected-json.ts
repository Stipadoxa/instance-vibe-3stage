// test-corrected-json.ts
import { FigmaRenderer } from './src/core/figma-renderer';
import { ComponentPropertyEngine } from './src/core/component-property-engine';
import * as fs from 'fs';

export async function testCorrectedJSON() {
  // Initialize engine
  await ComponentPropertyEngine.initialize();
  
  // Read the corrected JSON file
  const correctedJSON = JSON.parse(fs.readFileSync('./corrected-ui.json', 'utf-8'));

  console.log(" Testing corrected JSON with systematic engine...");
  
  try {
    // Generate UI
    const frame = await FigmaRenderer.generateUIFromDataDynamic(correctedJSON);
    
    if (frame) {
      console.log("✅ Corrected JSON test completed!");
      
      // Verify the tabs
      const tabInstance = frame.findOne(n => n.type === 'INSTANCE') as InstanceNode;
      if (tabInstance) {
        const textNodes = tabInstance.findAll(n => n.type === 'TEXT') as TextNode[];
        console.log(" Tab labels found:");
        textNodes.forEach((node, i) => {
          if (node.visible) {
            console.log(`  Tab ${i + 1}: "${node.characters}"`);
          }
        });
      }
    }
  } catch (error) {
    console.error("❌ Corrected JSON test failed:", error);
  }
}

// Run the test
testCorrectedJSON();
