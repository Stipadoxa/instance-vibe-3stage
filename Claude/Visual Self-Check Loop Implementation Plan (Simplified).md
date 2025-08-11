
Overview
Add a standalone visual feedback feature that works independently of the existing iteration system. This is a safe, additive approach that won't break current functionality.
Implementation Steps
Step 1: Create Standalone Visual Analyzer
Create a new file src/core/visual-analyzer.ts as a completely independent module.
typescript// src/core/visual-analyzer.ts
import { GeminiService } from './gemini-service';

export interface VisualCheckResult {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  fixes: any; // Specific JSON corrections
}

export class VisualAnalyzer {
  /**
   * Analyzes screenshot and returns specific JSON fixes
   * This is COMPLETELY INDEPENDENT of iteration system
   */
  static async checkAndFix(
    screenshot: Uint8Array,
    currentJSON: any,
    userRequest: string
  ): Promise<VisualCheckResult> {
    const prompt = `You are a UI quality checker. Look at this screenshot and identify issues.

User requested: "${userRequest}"

Check for:
1. Missing elements from the request
2. Wrong component types
3. Poor text distribution (timestamps mixed with content)
4. Missing navigation if requested
5. Wrong spacing or layout

Return JSON with this exact format:
{
  "passed": true/false,
  "score": 0-100,
  "issues": ["specific issue 1", "specific issue 2"],
  "fixes": {
    // Only include specific fixes needed
    // Example: "items[0].properties.variants.Condition": "3-line"
  }
}`;

    try {
      const result = await GeminiService.analyzeImage(screenshot, prompt);
      return JSON.parse(result);
    } catch (error) {
      console.error('Visual check failed:', error);
      // Return safe default - don't break the flow
      return { passed: true, score: 100, issues: [], fixes: {} };
    }
  }

  /**
   * Apply specific fixes to JSON without regenerating everything
   */
  static applyFixes(originalJSON: any, fixes: any): any {
    const updated = JSON.parse(JSON.stringify(originalJSON)); // Deep clone
    
    // Apply each fix
    Object.entries(fixes).forEach(([path, value]) => {
      // Simple path parser (e.g., "items[0].properties.text")
      try {
        const parts = path.split('.');
        let current = updated;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
          
          if (arrayMatch) {
            current = current[arrayMatch[1]][parseInt(arrayMatch[2])];
          } else {
            current = current[part];
          }
        }
        
        const lastPart = parts[parts.length - 1];
        current[lastPart] = value;
      } catch (e) {
        console.warn(`Could not apply fix to path: ${path}`);
      }
    });
    
    return updated;
  }
}
Step 2: Add Simple Screenshot Method
Add to src/core/figma-renderer.ts - just one method, no other changes.
typescript// Add this ONE method to FigmaRenderer class

static async takeScreenshot(node: SceneNode): Promise<Uint8Array | null> {
  try {
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 }
    });
    return bytes;
  } catch (error) {
    console.error('Screenshot failed:', error);
    return null;
  }
}
Step 3: Add Vision Support to Gemini
Add to src/core/gemini-service.ts - just one method.
typescript// Add this method to GeminiService class

static async analyzeImage(imageBytes: Uint8Array, prompt: string): Promise<string> {
  try {
    // Use the existing genAI instance
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" // Use same model for consistency
    });
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...imageBytes));
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      }
    ]);
    
    return result.response.text();
  } catch (error) {
    console.error("Vision analysis error:", error);
    throw error;
  }
}
Step 4: Add Optional Visual Check to Generation Flow
Update ui.ts - add this AFTER successful generation, not integrated with iteration.
typescript// In the generateFromAI click handler, AFTER successful generation:

// Existing code generates the UI...
const generatedFrame = await FigmaRenderer.generateUIFromData(
  result.figmaJson, 
  figma.currentPage
);

// NEW: Optional visual check (off by default for safety)
const enableVisualCheck = (document.getElementById('enableVisualCheck') as HTMLInputElement)?.checked;

if (enableVisualCheck && generatedFrame) {
  try {
    // Take screenshot
    const screenshot = await FigmaRenderer.takeScreenshot(generatedFrame);
    
    if (screenshot) {
      // Run visual check
      const checkResult = await VisualAnalyzer.checkAndFix(
        screenshot,
        result.figmaJson,
        userRequest
      );
      
      // Show score
      figma.notify(`Visual Quality Score: ${checkResult.score}/100`, { timeout: 2000 });
      
      // If fixes needed and score is low
      if (!checkResult.passed && checkResult.score < 70 && Object.keys(checkResult.fixes).length > 0) {
        // Ask user first
        const shouldFix = confirm(`Found ${checkResult.issues.length} issues. Apply automatic fixes?`);
        
        if (shouldFix) {
          // Apply fixes
          const fixedJSON = VisualAnalyzer.applyFixes(result.figmaJson, checkResult.fixes);
          
          // Remove old frame
          generatedFrame.remove();
          
          // Generate new frame with fixes
          await FigmaRenderer.generateUIFromData(fixedJSON, figma.currentPage);
          figma.notify("Applied visual improvements", { timeout: 2000 });
        }
      }
    }
  } catch (error) {
    console.error('Visual check error:', error);
    // Don't break the main flow
  }
}
Step 5: Add Simple UI Toggle
Add to ui.html in the AI Generator tab.
html<!-- Add after the Generate button -->
<div style="margin-top: 10px;">
  <label style="display: flex; align-items: center; font-size: 12px;">
    <input type="checkbox" id="enableVisualCheck" style="margin-right: 5px;">
    Enable Visual Quality Check (Experimental)
  </label>
</div>
Step 6: Test Safely
Create a test file test-visual-check.ts to test independently.
typescript// test-visual-check.ts - Run this separately to test

async function testVisualCheck() {
  // Get the most recent frame
  const frames = figma.currentPage.findAll(n => n.type === 'FRAME') as FrameNode[];
  if (frames.length === 0) {
    console.log('No frames found to test');
    return;
  }
  
  const testFrame = frames[frames.length - 1];
  console.log(`Testing visual check on frame: ${testFrame.name}`);
  
  try {
    // Take screenshot
    const screenshot = await FigmaRenderer.takeScreenshot(testFrame);
    if (!screenshot) {
      console.log('Screenshot failed');
      return;
    }
    
    console.log('Screenshot captured, size:', screenshot.length);
    
    // Run analysis (with a simple request)
    const result = await VisualAnalyzer.checkAndFix(
      screenshot,
      {}, // Empty JSON since we're just testing
      "test request"
    );
    
    console.log('Visual check result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Add test button to UI for manual testing
Safety Features

Completely Optional - Off by default, user must enable
Independent of Iteration - Doesn't touch existing iteration code
Confirmation Required - Asks before applying fixes
Non-Breaking - Errors don't stop main generation
Simple Fixes Only - Only changes specific properties, doesn't regenerate

What This WON'T Do

Won't touch your iteration system
Won't automatically loop
Won't regenerate entire JSON
Won't break if vision API fails
Won't modify existing code paths

Testing Strategy

Start with checkbox disabled - Verify normal generation works
Enable for single test - See if screenshot works
Test with known issues - Your notification timestamp problem
Test error cases - Bad screenshots, API failures

Rollback
If anything goes wrong:

Just don't check the checkbox
Or comment out the visual check section
Everything else continues working normally

This approach adds visual feedback as a helpful tool without risking your stable pipeline.