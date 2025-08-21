// src/core/figma-renderer.ts
// UI generation and rendering engine for AIDesigner

import { ComponentScanner, ColorStyleCollection, ColorStyle, TextStyle, DesignToken } from './component-scanner';
import { ComponentInfo, TextHierarchy, ComponentInstance, VectorNode, ImageNode, SessionManager } from './session-manager';
import { ComponentPropertyEngine, PropertyValidationResult, PerformanceTracker } from './component-property-engine';
import { JSONMigrator } from './json-migrator';

// RGB type definition for color values
interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RenderOptions {
  parentNode?: FrameNode | PageNode;
  replaceContent?: boolean;
}

export class FigmaRenderer {
  
  // Static storage for Color Styles scanned from the design system
  private static cachedColorStyles: ColorStyleCollection | null = null;
  private static cachedDesignTokens: DesignToken[] | null = null; // NEW: Design tokens cache
  
  // Static storage for Text Styles scanned from the design system
  private static cachedTextStyles: TextStyle[] | null = null;

  // Auto-positioning system to prevent overlapping renders
  private static async getNextRenderPosition(width: number, height: number): Promise<{x: number, y: number}> {
    const GRID_SPACING = 50; // Gap between frames
    const COLUMN_WIDTH = 400; // Max width per column before wrapping
    
    try {
      // Get stored position data
      const positionData = await figma.clientStorage.getAsync('uxpal-render-positions');
      let positions = positionData ? JSON.parse(positionData) : { nextX: 0, nextY: 0, currentRow: 0 };
      
      // Calculate position
      const currentX = positions.nextX;
      const currentY = positions.nextY;
      
      // Update for next render
      positions.nextX += width + GRID_SPACING;
      
      // Wrap to next row if needed
      if (positions.nextX > COLUMN_WIDTH * 3) { // Allow 3 columns max
        positions.nextX = 0;
        positions.nextY += Math.max(height, 812) + GRID_SPACING;
        positions.currentRow++;
      }
      
      // Save updated positions
      await figma.clientStorage.setAsync('uxpal-render-positions', JSON.stringify(positions));
      
      return { x: currentX, y: currentY };
    } catch (error) {
      console.warn('Position tracking failed, using default:', error);
      return { x: 0, y: 0 };
    }
  }

  // Reset render positions to start fresh
  static async resetRenderPositions(): Promise<void> {
    try {
      await figma.clientStorage.setAsync('uxpal-render-positions', JSON.stringify({ nextX: 0, nextY: 0, currentRow: 0 }));
      console.log('ðŸ”„ Render positions reset to origin');
    } catch (error) {
      console.warn('Failed to reset positions:', error);
    }
  }

  /**
   * Calculates the actual height needed for all content
   */
  private static calculateContentHeight(frame: FrameNode): number {
    let maxBottom = 0;
    
    for (const child of frame.children) {
      const childBottom = child.y + child.height;
      maxBottom = Math.max(maxBottom, childBottom);
    }
    
    // Add frame padding
    const paddingBottom = 'paddingBottom' in frame ? frame.paddingBottom : 0;
    return maxBottom + paddingBottom;
  }

  /**
   * Adjusts root frame height after content is rendered
   * Ensures minimum viewport height while hugging content
   */
  private static async adjustRootFrameHeight(rootFrame: FrameNode, minHeight: number = 812): Promise<void> {
    try {
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Calculate actual content height
      const contentHeight = this.calculateContentHeight(rootFrame);
      
      console.log('ðŸ“ Content height analysis:', {
        contentHeight,
        minHeight,
        shouldAdjust: contentHeight > minHeight,
        currentFrameHeight: rootFrame.height,
        primaryAxisSizing: rootFrame.primaryAxisSizingMode
      });
      
      // If content exceeds minimum, let it grow naturally
      // If content is smaller, keep minimum height
      if (contentHeight > minHeight && rootFrame.primaryAxisSizingMode === "AUTO") {
        console.log('âœ… Content height exceeds minimum - frame will hug content');
        // Auto-layout will handle this automatically
      } else {
        console.log('ðŸ“ Content fits within minimum - maintaining', minHeight, 'px height');
        // Frame will stay at minHeight due to minHeight constraint
      }
      
      // Force layout update
      if (rootFrame.layoutMode !== 'NONE') {
        // Trigger auto-layout recalculation
        const currentSpacing = rootFrame.itemSpacing;
        rootFrame.itemSpacing = currentSpacing;
      }
      
    } catch (error) {
      console.warn('âš ï¸ Failed to adjust root frame height:', error);
    }
  }

  /**
   * Main UI generation function - creates UI from structured JSON data
   */
  static async generateUIFromData(layoutData: any, parentNode: FrameNode | PageNode): Promise<FrameNode> {
    let currentFrame: FrameNode;
    const containerData = layoutData.layoutContainer || layoutData;
    
    if (parentNode.type === 'PAGE' && containerData) {
      currentFrame = figma.createFrame();
      
      // Set initial size - width fixed, height to minimum
      const initialWidth = containerData.width || 375;
      const minHeight = containerData.minHeight || 812;
      
      currentFrame.resize(initialWidth, minHeight);
      
      // Configure auto-layout FIRST, then sizing properties
      if (containerData.layoutMode && containerData.layoutMode !== 'NONE') {
        // Step 1: Enable auto-layout
        try {
          currentFrame.layoutMode = containerData.layoutMode;
          console.log('âœ… Set layoutMode to:', containerData.layoutMode);
        } catch (layoutModeError) {
          console.warn('âš ï¸ Could not set layoutMode:', layoutModeError.message);
          return currentFrame; // Exit early if auto-layout can't be enabled
        }
        
        // Step 2: Set sizing modes AFTER auto-layout is enabled
        try {
          // Key change: Use AUTO for primary axis (vertical) to hug content
          currentFrame.primaryAxisSizingMode = "AUTO"; // Force content hugging regardless of JSON
          console.log('âœ… Set primaryAxisSizingMode to AUTO');
        } catch (sizingError) {
          console.warn('âš ï¸ Could not set primaryAxisSizingMode:', sizingError.message);
        }
        
        try {
          currentFrame.counterAxisSizingMode = "FIXED"; // Keep width fixed
          console.log('âœ… Set counterAxisSizingMode to FIXED');
        } catch (counterError) {
          console.warn('âš ï¸ Could not set counterAxisSizingMode:', counterError.message);
        }
        
        // Step 3: Set minimum height constraint AFTER sizing modes
        try {
          if (minHeight) {
            currentFrame.minHeight = minHeight;
            console.log('âœ… Set minHeight to:', minHeight);
          }
        } catch (minHeightError) {
          console.warn('âš ï¸ Could not set minHeight:', minHeightError.message);
        }
      }
      
      // Auto-position to prevent overlapping
      const position = await this.getNextRenderPosition(initialWidth, minHeight);
      currentFrame.x = position.x;
      currentFrame.y = position.y;
      
      parentNode.appendChild(currentFrame);
    } else if (parentNode.type === 'FRAME') {
      currentFrame = parentNode;
    } else {
      figma.notify("Cannot add items without a parent frame.", { error: true });
      return figma.createFrame();
    }
    
    if (containerData && containerData !== layoutData) {
      currentFrame.name = containerData.name || "Generated Frame";
      currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
        ? containerData.layoutMode : "NONE";
        
      if (currentFrame.layoutMode !== 'NONE') {
        currentFrame.paddingTop = typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0;
        currentFrame.paddingBottom = typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0;
        currentFrame.paddingLeft = typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0;
        currentFrame.paddingRight = typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0;
        
        // Enhanced auto-layout properties
        if (containerData.itemSpacing === 'AUTO') {
          (currentFrame as any).itemSpacing = 'AUTO';
        } else {
          currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
        }
        
        // Layout wrap support
        try {
          if (containerData.layoutWrap !== undefined) {
            currentFrame.layoutWrap = containerData.layoutWrap;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set layoutWrap:', e.message);
        }
        
        // Primary axis alignment
        try {
          if (containerData.primaryAxisAlignItems) {
            currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set primaryAxisAlignItems:', e.message);
        }
        
        // Counter axis alignment
        try {
          if (containerData.counterAxisAlignItems) {
            currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set counterAxisAlignItems:', e.message);
        }
        
        // Sizing modes with setter checks
        const hasPrimarySetter = Object.getOwnPropertyDescriptor(currentFrame, 'primaryAxisSizingMode')?.set !== undefined;
        const hasCounterSetter = Object.getOwnPropertyDescriptor(currentFrame, 'counterAxisSizingMode')?.set !== undefined;
        
        if (hasPrimarySetter) {
          if (containerData.primaryAxisSizingMode) {
            currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
          } else if (currentFrame.primaryAxisSizingMode === 'FIXED') {
            // CRITICAL FIX: Don't override sizing modes that were already set by applyChildLayoutProperties
            // Only set default if frame still has FIXED (default from createFrame())
            currentFrame.primaryAxisSizingMode = "AUTO";
          }
        } else {
          console.warn('âš ï¸ Skipping primaryAxisSizingMode - setter not available');
        }
        
        if (hasCounterSetter && containerData.counterAxisSizingMode) {
          currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
        } else if (!hasCounterSetter) {
          console.warn('âš ï¸ Skipping counterAxisSizingMode - setter not available');
        }
      }
      
      // Size constraints - wrapped in try-catch to prevent property setter errors
      try {
        if (containerData.minWidth !== undefined) {
          currentFrame.minWidth = containerData.minWidth;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set minWidth:', e.message);
      }
      
      try {
        if (containerData.maxWidth !== undefined) {
          currentFrame.maxWidth = containerData.maxWidth;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set maxWidth:', e.message);
      }
      
      try {
        if (containerData.minHeight !== undefined) {
          currentFrame.minHeight = containerData.minHeight;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set minHeight:', e.message);
      }
      
      try {
        if (containerData.maxHeight !== undefined) {
          currentFrame.maxHeight = containerData.maxHeight;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set maxHeight:', e.message);
      }
      
      if (containerData.width) {
        if (currentFrame.layoutMode !== 'NONE') {
          // For auto-layout frames, set width directly and let auto-layout handle height
          currentFrame.width = containerData.width;
          if (!containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = "FIXED";
          }
        } else {
          // For regular frames, use resize
          currentFrame.resize(containerData.width, currentFrame.height);
        }
      } else if (!containerData.counterAxisSizingMode) {
        currentFrame.counterAxisSizingMode = "AUTO";
      }
    }
    
    const items = layoutData.items || containerData.items;
    if (!items || !Array.isArray(items)) return currentFrame;
    
    for (const item of items) {
      if (item.type === 'layoutContainer') {
        const nestedFrame = figma.createFrame();
        currentFrame.appendChild(nestedFrame);
        
        console.log('ðŸ” DEBUG: Created nested frame with default sizing modes:', {
          primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
          counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
          layoutMode: nestedFrame.layoutMode
        });
        
        // Apply child layout properties
        this.applyChildLayoutProperties(nestedFrame, item);
        
        // CRITICAL FIX: Reset height for horizontal AUTO containers (alternative code path)
        if (nestedFrame.layoutMode === 'HORIZONTAL' && nestedFrame.primaryAxisSizingMode === 'AUTO') {
          console.log('ðŸ”§ HORIZONTAL AUTO CONTAINER (ALT PATH): Forcing height reset from default 100px');
          
          // Direct approach: Force height to hug by resetting the frame height
          try {
            console.log('ðŸ“ Current height before fix:', nestedFrame.height);
            
            const children = nestedFrame.children;
            if (children.length > 0) {
              // Calculate the maximum height of child elements
              let maxChildHeight = 0;
              for (const child of children) {
                if ('height' in child) {
                  maxChildHeight = Math.max(maxChildHeight, (child as any).height);
                }
              }
              
              console.log('ðŸ“ Calculated max child height:', maxChildHeight);
              
              if (maxChildHeight > 0 && maxChildHeight !== nestedFrame.height) {
                // Apply padding if it exists
                const paddingTop = (nestedFrame as any).paddingTop || 0;
                const paddingBottom = (nestedFrame as any).paddingBottom || 0;
                const targetHeight = maxChildHeight + paddingTop + paddingBottom;
                
                console.log('ðŸ“ Setting frame height to:', targetHeight);
                nestedFrame.resize(nestedFrame.width, targetHeight);
              }
            }
            
            console.log('ðŸ“ Final height after fix:', nestedFrame.height);
            console.log('âœ… Height reset complete - should now hug content');
          } catch (error) {
            console.error('âŒ Height reset failed:', error);
          }
        }
        
        console.log('ðŸ” DEBUG: After applyChildLayoutProperties:', {
          primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
          counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
          layoutMode: nestedFrame.layoutMode,
          height: nestedFrame.height
        });
        
        await this.generateUIFromData({ layoutContainer: item, items: item.items }, nestedFrame);
        
        console.log('ðŸ” DEBUG: Final nested frame properties:', {
          primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
          counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
          layoutMode: nestedFrame.layoutMode,
          height: nestedFrame.height,
          name: nestedFrame.name
        });
        
      } else if (item.type === 'frame' && item.layoutContainer) {
        const nestedFrame = figma.createFrame();
        currentFrame.appendChild(nestedFrame);
        await this.generateUIFromData(item, nestedFrame);
        
      }
      
      // Safe defensive conversion for native elements with children
      else if (item.type?.startsWith('native-') && (item.items || item.properties?.items)) {
        console.warn(`âš ï¸ Invalid structure: ${item.type} cannot have child items`);
        console.warn('ðŸ“¦ Auto-converting to layoutContainer to prevent crash');
        
        // Extract the items array (might be in different places)
        const childItems = item.items || item.properties?.items || [];
        
        // Create a proper container that preserves visual intent
        const safeContainer = {
          type: 'layoutContainer',
          layoutMode: 'VERTICAL',
          itemSpacing: 0,
          padding: 0,
          items: childItems
        };
        
        // Preserve visual styling if it was a styled rectangle
        if (item.type === 'native-rectangle' && item.properties) {
          // Transfer visual properties safely
          if (item.properties.fill?.color) {
            safeContainer.backgroundColor = item.properties.fill.color;
          }
          if (item.properties.cornerRadius) {
            safeContainer.cornerRadius = item.properties.cornerRadius;
          }
          if (item.properties.padding) {
            safeContainer.padding = item.properties.padding;
          }
          // Transfer sizing if present
          if (item.properties.width) {
            safeContainer.width = item.properties.width;
          }
          if (item.properties.height) {
            safeContainer.height = item.properties.height;
          }
        }
        
        // Log what we're doing for debugging
        console.log('ðŸ”„ Converted structure:', {
          from: item.type,
          to: 'layoutContainer',
          preservedStyling: {
            backgroundColor: safeContainer.backgroundColor || 'none',
            cornerRadius: safeContainer.cornerRadius || 'none'
          }
        });
        
        // Process as container instead of native element
        const nestedFrame = figma.createFrame();
        currentFrame.appendChild(nestedFrame);
        
        this.applyChildLayoutProperties(nestedFrame, safeContainer);
        
        await this.generateUIFromData({ layoutContainer: safeContainer, items: safeContainer.items }, nestedFrame);
        continue;
      }
      // NATIVE ELEMENTS - Handle these BEFORE component resolution
      else if (item.type === 'native-text' || item.type === 'text') {
        await this.createTextNode(item, currentFrame);
        continue;
      }
      else if (item.type === 'native-rectangle') {
        await this.createRectangleNode(item, currentFrame);
        continue;
      }
      else if (item.type === 'native-circle') {
        await this.createEllipseNode(item, currentFrame);
        continue;
      }
      // COMPONENT ELEMENTS - All other types go through component resolution
      else {
        if (!item.componentNodeId) continue;
        
        const componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
        if (!componentNode) {
          console.warn(`âš ï¸ Component with ID ${item.componentNodeId} not found. Skipping.`);
          continue;
        }
        
        const masterComponent = (componentNode.type === 'COMPONENT_SET'
          ? componentNode.defaultVariant
          : componentNode) as ComponentNode | null;
          
        if (!masterComponent || masterComponent.type !== 'COMPONENT') {
          console.warn(`âš ï¸ Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
          continue;
        }
        
        const instance = masterComponent.createInstance();
        currentFrame.appendChild(instance);
        
        console.log(`ðŸ”§ Creating instance of component: ${masterComponent.name}`);
        console.log(`ðŸ”§ Raw properties:`, item.properties);

        const {cleanProperties, variants} = this.separateVariantsFromProperties(item.properties, item.componentNodeId);
        const sanitizedProps = this.sanitizeProperties(cleanProperties);

        console.log(`ðŸ”§ Clean properties:`, sanitizedProps);
        console.log(`ðŸ”§ Extracted variants:`, variants);

        // Apply variants
        if (Object.keys(variants).length > 0) {
          try {
            if (componentNode && componentNode.type === 'COMPONENT_SET') {
              const availableVariants = componentNode.variantGroupProperties;
              console.log(`ðŸ” Available variants for ${componentNode.name}:`, Object.keys(availableVariants || {}));
              console.log(`ðŸ” Requested variants:`, variants);
              
              if (!availableVariants) {
                console.warn('âš ï¸ No variant properties found on component, skipping variant application.');
              } else {
                const validVariants: { [key: string]: string } = {};
                let hasValidVariants = false;
                
                Object.entries(variants).forEach(([propName, propValue]) => {
                  const availableProp = availableVariants[propName];
                  if (availableProp && availableProp.values) {
                    // Convert boolean values to capitalized strings for Figma
                    let stringValue: string;
                    if (typeof propValue === 'boolean') {
                      stringValue = propValue ? 'True' : 'False';
                      console.log(`ðŸ”„ Boolean conversion: ${propName} = ${propValue} -> "${stringValue}"`);
                    } else {
                      stringValue = String(propValue);
                    }
                    
                    if (availableProp.values.includes(stringValue)) {
                      validVariants[propName] = stringValue;
                      hasValidVariants = true;
                      console.log(`âœ… Valid variant: ${propName} = "${stringValue}"`);
                    } else {
                      console.warn(`âš ï¸ Invalid value for "${propName}": "${stringValue}". Available: [${availableProp.values.join(', ')}]`);
                    }
                  } else {
                    console.warn(`âš ï¸ Unknown variant property: "${propName}". Available: [${Object.keys(availableVariants).join(', ')}]`);
                  }
                });
                
                if (hasValidVariants) {
                  console.log(`ðŸ”§ Applying variants:`, validVariants);
                  instance.setProperties(validVariants);
                  console.log('âœ… Variants applied successfully');
                } else {
                  console.warn('âš ï¸ No valid variants to apply, using default variant');
                }
              }
            } else {
              console.log('â„¹ï¸ Component is not a variant set, skipping variant application');
            }
          } catch (e) {
            console.error("âŒ Error applying variants:", e);
            console.log("â„¹ï¸ Continuing with default variant");
          }
        }
        
        // Apply child layout properties
        this.applyChildLayoutProperties(instance, sanitizedProps);
        
        // Apply text properties to component
        await this.applyTextProperties(instance, sanitizedProps);
        
        // Apply media properties to component
        await this.applyMediaProperties(instance, sanitizedProps);
      }
    }
    
    if (parentNode.type === 'PAGE') {
      // Adjust root frame height after content is rendered
      await this.adjustRootFrameHeight(currentFrame, containerData?.minHeight || 812);
      
      figma.currentPage.selection = [currentFrame];
      figma.viewport.scrollAndZoomIntoView([currentFrame]);
      figma.notify(`UI "${currentFrame.name}" generated!`, { timeout: 2500 });
    }
    return currentFrame;
  }

  /**
   * Dynamic UI generation with component ID resolution
   */
  static async generateUIFromDataDynamic(layoutData: any): Promise<FrameNode | null> {
    console.log('ðŸš€ START generateUIFromDataDynamic', { hasLayoutData: !!layoutData, hasItems: !!layoutData?.items });
    
    if (!layoutData || (!layoutData.items && !layoutData.layoutContainer)) {
      figma.notify("Invalid JSON structure", { error: true });
      return null;
    }

    try {
      // Enable performance optimizations
      figma.skipInvisibleInstanceChildren = true;
      
      // Load design system data if not already cached
      await this.ensureDesignSystemDataLoaded();
      
      // Skip ComponentPropertyEngine for testing if no schemas available
      console.log('ðŸ”§ Checking ComponentPropertyEngine schemas...');
      const existingSchemas = ComponentPropertyEngine.getAllSchemas();
      if (existingSchemas.length === 0) {
        console.log('âš ï¸ No design system schemas found - running in basic mode');
      } else {
        await ComponentPropertyEngine.initialize();
        console.log('âœ… ComponentPropertyEngine initialized with', existingSchemas.length, 'schemas');
      }

      // Migrate JSON if needed
      const migratedData = JSONMigrator.migrateToSystematic(layoutData);
      
      // Existing ID resolution logic
      const isPlaceholderID = (id: string): boolean => {
        if (!id) return true;
        return id.includes('_id') ||
               id.includes('placeholder') ||
               !id.match(/^[0-9]+:[0-9]+$/);
      };

      async function resolveComponentIds(items: any[]): Promise<void> {
          for (const item of items) {
            if (item.type === 'layoutContainer') {
              if (item.items && Array.isArray(item.items)) {
                await resolveComponentIds(item.items);
              }
              continue;
            }
            
            // SKIP native elements - they don't need component IDs
            if (item.type === 'native-text' ||
                item.type === 'text' ||
                item.type === 'native-rectangle' ||
                item.type === 'native-circle') {
              console.log(`â„¹ï¸ Skipping native element: ${item.type}`);
              continue;
            }
            
            if (item.type === 'frame' && item.items) {
              await resolveComponentIds(item.items);
            }
            else if (item.type !== 'frame') {
              if (!item.componentNodeId || isPlaceholderID(item.componentNodeId)) {
                console.log(` Resolving component ID for type: ${item.type}`);
                const resolvedId = await ComponentScanner.getComponentIdByType(item.type);
                if (!resolvedId) {
                  throw new Error(`Component for type "${item.type}" not found in design system. Please scan your design system first.`);
                }
                item.componentNodeId = resolvedId;
                console.log(`âœ… Resolved ${item.type} -> ${resolvedId}`);
              } else {
                console.log(`âœ… Using existing ID for ${item.type}: ${item.componentNodeId}`);
              }
            }
          }
        }

      await resolveComponentIds(migratedData.items);
      console.log('ðŸŸ¢ USING SYSTEMATIC GENERATION METHOD');
      
      // Get real design system data for icon swaps
      let designSystemData = null;
      try {
        console.log('ðŸ” Loading real design system data from storage...');
        
        // Try to get design system data from figma.clientStorage
        if (typeof figma !== 'undefined' && figma.clientStorage) {
          const scanSession = await figma.clientStorage.getAsync('design-system-scan');
          if (scanSession && scanSession.components) {
            designSystemData = {
              components: scanSession.components,
              colorStyles: scanSession.colorStyles || null,
              scanTime: scanSession.scanTime,
              totalCount: scanSession.components.length
            };
            
            const iconCount = scanSession.components.filter((comp: any) => comp.suggestedType === 'icon').length;
            console.log('âœ… Loaded real design system data:', {
              totalComponents: scanSession.components.length,
              iconComponents: iconCount,
              scanTime: new Date(scanSession.scanTime).toLocaleString(),
              fileKey: scanSession.fileKey
            });
            
            // Log available icons for debugging
            const icons = scanSession.components.filter((comp: any) => comp.suggestedType === 'icon');
            console.log('ðŸŽ¨ Available icons:', icons.slice(0, 10).map((icon: any) => `${icon.name} (${icon.id})`));
            
          } else {
            console.warn('âš ï¸ No design-system-scan data found in storage');
            
            // Fallback: try last-scan-results
            const lastScan = await figma.clientStorage.getAsync('last-scan-results');
            if (lastScan && Array.isArray(lastScan)) {
              designSystemData = {
                components: lastScan,
                totalCount: lastScan.length
              };
              console.log('âœ… Using fallback last-scan-results data:', lastScan.length, 'components');
            }
          }
        } else {
          console.warn('âš ï¸ figma.clientStorage not available');
        }
      } catch (error) {
        console.error('âŒ Error loading design system data:', error);
      }
      
      return await this.generateUIFromDataSystematic(migratedData, figma.currentPage, designSystemData);
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      figma.notify(errorMessage, { error: true, timeout: 4000 });
      console.error("âŒ generateUIFromDataDynamic error:", e);
      return null;
    }
  }

  /**
   * Detects if a container has width constraints that should constrain text
   * NEW LOGIC: Uses effective width calculation from parent chain
   */
  private static detectWidthConstraint(container: FrameNode): boolean {
    console.log('ðŸ” Detecting width constraint for container:', {
      type: container.type,
      layoutMode: container.layoutMode,
      width: container.width,
      name: container.name
    });
    
    // Calculate effective width from parent chain
    const effectiveWidth = this.calculateEffectiveWidth(container);
    
    // Keep 375px threshold as requested
    if (effectiveWidth && effectiveWidth <= 375) {
      console.log('âœ… Width constraint detected: Effective width =', effectiveWidth);
      return true;
    }
    
    console.log('âŒ No width constraint: Effective width =', effectiveWidth || 'null');
    return false;
  }

  /**
   * Debug helper to log the full parent chain for width analysis
   * Useful for troubleshooting width constraint detection issues
   */
  private static debugParentChain(container: FrameNode): void {
    console.log('ðŸ” DEBUG: Parent chain analysis for:', container.name);
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

  /**
   * Calculate effective width constraint from parent chain
   * Enhanced to handle FILL containers and metadata from JSON Engineer
   * Walks up the layout hierarchy to find actual width limits
   */
  private static calculateEffectiveWidth(container: FrameNode): number | null {
    console.log('ðŸ§® Calculating effective width for:', container.name);
    
    let current: FrameNode | null = container;
    let level = 0;
    
    while (current && level < 10) { // Prevent infinite loops
      console.log(`  Level ${level}: ${current.name} (${current.layoutMode || 'no-layout'})`);
      
      // Case 1: Root container with explicit fixed width
      if (current.primaryAxisSizingMode === 'FIXED' &&
          current.counterAxisSizingMode === 'FIXED' &&
          current.width > 0) {
        const rootWidth = current.width;
        console.log(`  âœ… Case 1 - Found root width: ${rootWidth}px`);
        return rootWidth;
      }
      
      // Case 2: Container with actual width (any container that has width set)
      if (current.width > 0) {
        const constrainedWidth = current.width -
          (current.paddingLeft || 0) -
          (current.paddingRight || 0);
        console.log(`  âœ… Case 2 - Found container width: ${current.width}px, usable: ${constrainedWidth}px`);
        return Math.max(constrainedWidth, 100); // Minimum 100px
      }
      
      // Case 3: NEW - Check for _effectiveWidth metadata from JSON Engineer
      // This metadata is added during JSON processing to help with width calculation
      if ((current as any)._effectiveWidth) {
        const metadataWidth = (current as any)._effectiveWidth;
        console.log(`  âœ… Case 3 - Found _effectiveWidth metadata: ${metadataWidth}px`);
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
          
          console.log(`  ðŸ” Case 4 - Checking FILL in VERTICAL parent`);
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
            console.log(`  âœ… Case 4 - Inherited from VERTICAL parent: ${parentWidth}px, available: ${availableWidth}px`);
            return Math.max(availableWidth, 100);
          }
        }
        
        // Case 5: NEW - Check if parent has any width constraint we can use
        if (parentFrame.layoutMode === 'HORIZONTAL' && parentFrame.width > 0) {
          // HORIZONTAL parent with fixed width also constrains children
          const parentWidth = parentFrame.width -
            (parentFrame.paddingLeft || 0) -
            (parentFrame.paddingRight || 0);
          console.log(`  âœ… Case 5 - HORIZONTAL parent with width: ${parentWidth}px`);
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
    
    console.log('  âŒ No effective width found in parent chain (reached top or max depth)');
    return null;
  }

  /**
   * Create native text element
   */
  static async createTextNode(textData: any, container: FrameNode): Promise<void> {
    console.log('Creating native text:', textData);
    
    const textNode = figma.createText();
    
    // Load default font
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    
    // Extract text content from various possible property names
    const textContent = textData.text || textData.content || textData.properties?.content || textData.characters || "Text";
    textNode.characters = textContent;
    
    // Extract and apply properties from the properties object
    const props = textData.properties || textData;

    // NEW: Extract width constraint metadata from JSON Engineer
    const constraintWidth = (textData as any)._constraintWidth || null;
    const parentLayout = (textData as any)._parentLayout || null;
    const useFlexFill = (textData as any)._useFlexFill || false;

    console.log('ðŸ“ Text metadata:', {
      constraintWidth,
      parentLayout,
      useFlexFill,
      content: props.content?.substring(0, 30) + '...'
    });
    
    // Font size
    const fontSize = props.fontSize || props.size || props.textSize || 16;
    textNode.fontSize = fontSize;
    
    // Font weight
    if (props.fontWeight === 'bold' || props.weight === 'bold' || props.style === 'bold') {
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      textNode.fontName = { family: "Inter", style: "Bold" };
    }
    
    // Text alignment
    if (props.alignment === 'center' || props.textAlign === 'center') {
      textNode.textAlignHorizontal = 'CENTER';
    } else if (props.alignment === 'right' || props.textAlign === 'right') {
      textNode.textAlignHorizontal = 'RIGHT';
    } else {
      textNode.textAlignHorizontal = 'LEFT';
    }
    
    // Color (if available) - supports both RGB objects and semantic color names
    if (props.color) {
      const fills = textNode.fills as Paint[];
      if (fills.length > 0 && fills[0].type === 'SOLID') {
        // Check if color is a semantic color name (string)
        if (typeof props.color === 'string') {
          console.log(`ðŸŽ¨ Attempting to resolve semantic color: "${props.color}"`);
          
          try {
            // Try to apply actual Figma color style first
            const colorStyle = await this.resolveColorStyleReference(props.color);
            if (colorStyle) {
              await textNode.setFillStyleIdAsync(colorStyle.id);
              console.log(`âœ… Applied semantic color "${props.color}" to text (as style reference)`);
            } else {
              // Fallback to RGB color if style not found
              const resolvedColor = this.resolveColorReference(props.color);
              if (resolvedColor) {
                textNode.fills = [this.createSolidPaint(resolvedColor)];
                console.log(`âœ… Applied semantic color "${props.color}" to text (as RGB fallback)`);
              } else {
                console.warn(`âš ï¸ Could not resolve semantic color "${props.color}", skipping color application`);
              }
            }
          } catch (error) {
            console.error(`âŒ Error applying color "${props.color}":`, error);
            // Continue without color if there's an error
          }
        } else if (typeof props.color === 'object' && 'r' in props.color) {
          // Handle RGB object - remove alpha channel if present
          const { r, g, b } = props.color;
          textNode.fills = [{ type: 'SOLID', color: { r, g, b } }];
        } else {
          // Handle other cases
          textNode.fills = [{ type: 'SOLID', color: props.color }];
        }
      }
    }
    
    // Color style name support (new feature) - applies actual Figma color style
    if (props.colorStyleName) {
      console.log(`ðŸŽ¨ Attempting to resolve color style: "${props.colorStyleName}"`);
      
      try {
        // Try to apply actual Figma color style first
        const colorStyle = await this.resolveColorStyleReference(props.colorStyleName);
        if (colorStyle) {
          await textNode.setFillStyleIdAsync(colorStyle.id);
          console.log(`âœ… Applied color style "${props.colorStyleName}" to text (as style reference)`);
        } else {
          // Fallback to RGB color if style not found
          const resolvedColor = this.resolveColorReference(props.colorStyleName);
          if (resolvedColor) {
            textNode.fills = [this.createSolidPaint(resolvedColor)];
            console.log(`âœ… Applied color style "${props.colorStyleName}" to text (as RGB fallback)`);
          } else {
            console.warn(`âš ï¸ Could not resolve color style "${props.colorStyleName}", skipping color application`);
          }
        }
      } catch (error) {
        console.error(`âŒ Error applying color style "${props.colorStyleName}":`, error);
        // Continue without color if there's an error
      }
    }
    
    // Text style support (new feature) - applies actual Figma text style
    if (props.textStyle || props.textStyleName) {
      const styleName = props.textStyle || props.textStyleName;
      console.log(`ðŸ“ Attempting to apply text style: "${styleName}"`);
      
      try {
        await FigmaRenderer.applyTextStyle(textNode, styleName);
      } catch (error) {
        console.error(`âŒ Error applying text style "${styleName}":`, error);
        // Continue without text style if there's an error
      }
    }
    
    // ENHANCED: Text auto-resize with flex-fill support and layout properties
    // _useFlexFill metadata indicates text should fill container width via auto-layout
    // This requires both textAutoResize: 'HEIGHT' AND proper layoutAlign/layoutGrow properties
    const isInConstrainedContainer = this.detectWidthConstraint(container);

    // Debug: Log decision factors
    if (useFlexFill) {
      console.log('ðŸ“ Text flex-fill decision:', {
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
    
    if (useFlexFill) {
      // HORIZONTAL containers or VERTICAL-in-HORIZONTAL: Use flex-fill
      textNode.textAutoResize = 'HEIGHT';  // Height flexible, width managed by auto-layout
      
      // ✅ FIX: Apply layout properties directly to text nodes for flex-fill behavior
      try {
        if (parentLayout === 'VERTICAL' || parentLayout === 'VERTICAL_IN_HORIZONTAL') {
          // In vertical layouts, text should stretch horizontally to fill container width
          textNode.layoutAlign = 'STRETCH';
          console.log('🔧 Applied layoutAlign: STRETCH for vertical parent layout');
        } else if (parentLayout === 'HORIZONTAL') {
          // In horizontal layouts, text should grow to fill available space
          textNode.layoutGrow = 1;
          textNode.layoutAlign = 'STRETCH';
          console.log('🔧 Applied layoutGrow: 1 and layoutAlign: STRETCH for horizontal parent layout');
        } else {
          // Default case: stretch to fill available width
          textNode.layoutAlign = 'STRETCH';
          console.log('🔧 Applied default layoutAlign: STRETCH for unknown parent layout');
        }
      } catch (layoutError) {
        console.warn('⚠️ Could not apply layout properties to text node with _useFlexFill:', layoutError.message);
        // Continue without layout properties - text will still have correct textAutoResize
      }
      
      console.log('✅ FINAL: Applied flex-fill with layout properties', {
        parentLayout,
        textAutoResize: 'HEIGHT',
        layoutAlign: textNode.layoutAlign,
        layoutGrow: textNode.layoutGrow || 'not-set',
        strategy: parentLayout === 'VERTICAL_IN_HORIZONTAL' ? 'nested' : 'direct'
      });
    } else if (isInConstrainedContainer && !useFlexFill) {
      textNode.textAutoResize = 'HEIGHT';  // Width constrained, height flexible
      
      // Priority 1: Use metadata from JSON Engineer
      // Priority 2: Calculate effective width
      // Priority 3: Fallback to container width
      let targetWidth = constraintWidth;
      
      if (!targetWidth) {
        const effectiveWidth = this.calculateEffectiveWidth(container);
        targetWidth = effectiveWidth;
      }
      
      if (!targetWidth) {
        targetWidth = container.width;
      }
      
      // Account for container padding
      const availableWidth = Math.max(
        targetWidth - ((container.paddingLeft || 0) + (container.paddingRight || 0)),
        100  // Minimum 100px
      );
      
      textNode.resize(availableWidth, textNode.height);
      
      console.log('âœ… FINAL: Applied width constraint', {
        source: constraintWidth ? 'metadata' : 'calculated',
        targetWidth,
        availableWidth,
        containerPadding: (container.paddingLeft || 0) + (container.paddingRight || 0)
      });
    } else {
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // Free expansion
      console.log('âœ… FINAL: Applied free expansion (no width constraint detected)');
    }
    
    // Note: applyChildLayoutProperties will safely ignore text nodes (returns early for type 'TEXT')
    this.applyChildLayoutProperties(textNode, props);
    
    container.appendChild(textNode);
    console.log('Native text created successfully');
  }

  /**
   * Create native rectangle element
   */
  static async createRectangleNode(rectData: any, container: FrameNode): Promise<void> {
    console.log('Creating native rectangle:', rectData);
    
    const rect = figma.createRectangle();
    
    // Extract and apply properties from the properties object (same pattern as native text)
    const props = rectData.properties || rectData;
    
    // Set dimensions - respect explicit width/height properties
    const width = props.width || rectData.width || 100;
    const height = props.height || rectData.height || 100;
    rect.resize(width, height);
    
    // Set fill color - support solid colors and image fills
    if (props.fill || rectData.fill) {
      const fillColor = props.fill || rectData.fill;
      try {
        if (typeof fillColor === 'string' && fillColor.includes('#')) {
          // Convert hex string to RGB object
          const hexColor = fillColor.replace('#', '');
          if (hexColor.length === 6) {
            const r = parseInt(hexColor.substr(0, 2), 16) / 255;
            const g = parseInt(hexColor.substr(2, 2), 16) / 255;
            const b = parseInt(hexColor.substr(4, 2), 16) / 255;
            // Only set if valid numbers
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
              rect.fills = [{ type: 'SOLID', color: { r, g, b } }];
            }
          }
        } else if (fillColor && typeof fillColor === 'object' && 'r' in fillColor) {
          // Already an RGB object - remove alpha channel if present
          const { r, g, b } = fillColor;
          rect.fills = [{ type: 'SOLID', color: { r, g, b } }];
        } else if (fillColor && typeof fillColor === 'object' && fillColor.type === 'IMAGE') {
          // Handle image fill
          await this.applyImageFill(rect, fillColor);
        }
      } catch (error) {
        console.log('Skipping invalid fill color:', fillColor);
      }
    }
    
    // Set corner radius
    if (props.cornerRadius || rectData.cornerRadius) {
      const radius = props.cornerRadius || rectData.cornerRadius;
      rect.cornerRadius = radius;
    }
    
    // Apply child layout properties (same as native text)
    this.applyChildLayoutProperties(rect, props);
    
    // Handle horizontal sizing properly (same as native text behavior)
    if (props.horizontalSizing === 'FILL') {
      rect.layoutAlign = 'STRETCH';
      rect.layoutGrow = 1;
    }
    
    container.appendChild(rect);
    console.log('Rectangle created successfully');
  }

  /**
   * Apply image fill to a shape element (rectangle or ellipse)
   */
  static async applyImageFill(element: RectangleNode | EllipseNode, fillData: any): Promise<void> {
    console.log('ðŸ” DEBUG: applyImageFill called with:', fillData);
    console.log('ðŸ” DEBUG: Element type:', element.type);
    
    try {
      const imageUrl = fillData.imageUrl;
      const scaleMode = fillData.scaleMode || 'FILL';
      
      console.log('ðŸ” DEBUG: imageUrl:', imageUrl);
      console.log('ðŸ” DEBUG: scaleMode:', scaleMode);
      
      if (!imageUrl) {
        console.log('ðŸ” DEBUG: No imageUrl - attempting native placeholder');
        
        // Try different approaches to create image placeholder
        try {
          // Create a simple 2x2 checkered pattern (light gray and white)
          const checkeredPattern = new Uint8Array([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, // 2x2 pixels
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x5D, 0x68, // RGB color type
            0x16, 0x00, 0x00, 0x00, 0x18, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x08, 0x1D, 0x01, 0x0D, 0x00, 0xF2, 0xFF, // Compressed data
            0xFF, 0xFF, 0xFF, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, // White and light gray pixels
            0xF0, 0xFF, 0xFF, 0xFF, 0x23, 0x28, 0x01, 0x99, // Creating checkered pattern
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
            0xAE, 0x42, 0x60, 0x82
          ]);
          
          const placeholderImage = figma.createImage(checkeredPattern);
          console.log('ðŸ” DEBUG: Created placeholder image with hash:', placeholderImage.hash);
          
          const placeholderPaint: ImagePaint = {
            type: 'IMAGE',
            imageHash: placeholderImage.hash,
            scaleMode: scaleMode as any
          };
          
          console.log('ðŸ” DEBUG: Created ImagePaint:', placeholderPaint);
          element.fills = [placeholderPaint];
          console.log('ðŸ” DEBUG: Applied fills to element');
          console.log('ðŸ” DEBUG: Element fills after setting:', element.fills);
          return;
          
        } catch (placeholderError) {
          console.log('ðŸ” DEBUG: Placeholder creation failed:', placeholderError);
          throw placeholderError;
        }
      }
      
      console.log('ðŸ” DEBUG: Creating image from URL:', imageUrl);
      // Create image from URL
      const image = await figma.createImageAsync(imageUrl);
      console.log('ðŸ” DEBUG: Created image with hash:', image.hash);
      
      // Create ImagePaint fill
      const imagePaint: ImagePaint = {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: scaleMode as any // FILL, STRETCH, FIT, CROP, etc.
      };
      
      console.log('ðŸ” DEBUG: Created ImagePaint from URL:', imagePaint);
      element.fills = [imagePaint];
      console.log('ðŸ” DEBUG: Applied URL image fill successfully');
      console.log('ðŸ” DEBUG: Element fills after URL setting:', element.fills);
      
    } catch (error) {
      console.log('ðŸ” DEBUG: applyImageFill error occurred:', error);
      console.log('ðŸ” DEBUG: Falling back to solid gray');
      
      // Ultimate fallback to solid gray for debugging
      const grayFill = { type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } };
      element.fills = [grayFill];
      console.log('ðŸ” DEBUG: Applied gray fallback:', grayFill);
      console.log('ðŸ” DEBUG: Element fills after fallback:', element.fills);
    }
  }


  /**
   * Create native ellipse element
   */
  static async createEllipseNode(ellipseData: any, container: FrameNode): Promise<void> {
    console.log('Creating native ellipse:', ellipseData);
    
    const ellipse = figma.createEllipse();
    
    // Extract and apply properties from the properties object (same pattern as native text)
    const props = ellipseData.properties || ellipseData;
    
    // Set dimensions - respect explicit width/height properties
    const width = props.width || ellipseData.width || 50;
    const height = props.height || ellipseData.height || 50;
    ellipse.resize(width, height);
    
    // Set fill color - support solid colors and image fills
    if (props.fill || ellipseData.fill) {
      const fillColor = props.fill || ellipseData.fill;
      try {
        if (typeof fillColor === 'string' && fillColor.includes('#')) {
          // Convert hex string to RGB object
          const hexColor = fillColor.replace('#', '');
          if (hexColor.length === 6) {
            const r = parseInt(hexColor.substr(0, 2), 16) / 255;
            const g = parseInt(hexColor.substr(2, 2), 16) / 255;
            const b = parseInt(hexColor.substr(4, 2), 16) / 255;
            // Only set if valid numbers
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
              ellipse.fills = [{ type: 'SOLID', color: { r, g, b } }];
            }
          }
        } else if (fillColor && typeof fillColor === 'object' && 'r' in fillColor) {
          // Already an RGB object - remove alpha channel if present
          const { r, g, b } = fillColor;
          ellipse.fills = [{ type: 'SOLID', color: { r, g, b } }];
        } else if (fillColor && typeof fillColor === 'object' && fillColor.type === 'IMAGE') {
          // Handle image fill
          await this.applyImageFill(ellipse, fillColor);
        }
      } catch (error) {
        console.log('Skipping invalid fill color:', fillColor);
      }
    }
    
    // Apply child layout properties (same as native text)
    this.applyChildLayoutProperties(ellipse, props);
    
    // Handle horizontal sizing properly (same as native text behavior)
    if (props.horizontalSizing === 'FILL') {
      ellipse.layoutAlign = 'STRETCH';
      ellipse.layoutGrow = 1;
    }
    
    container.appendChild(ellipse);
    console.log('Ellipse created successfully');
  }

  /**
   * Apply text properties to component instances using enhanced scan data
   */
  static async applyTextProperties(instance: InstanceNode, properties: any): Promise<void> {
    if (!properties) return;
    
    console.log("ðŸ” Applying text properties:", properties);
    
    // Get all text nodes in the instance with error handling
    let allTextNodes: TextNode[] = [];
    try {
      allTextNodes = instance.findAll(n => n.type === 'TEXT') as TextNode[];
    } catch (findError) {
      console.error(`âŒ Error finding text nodes in component instance:`, findError.message);
      return; // Skip text property application if we can't find nodes
    }
    console.log("ðŸ” Available text nodes in component:",
      allTextNodes.map(textNode => ({
        name: textNode.name,
        id: textNode.id,
        visible: textNode.visible,
        chars: textNode.characters || '[empty]'
      }))
    );

    // Get the component's textHierarchy data from scan results
    const componentTextHierarchy = await this.getComponentTextHierarchy(instance);
    console.log("ðŸ” Text hierarchy from scan data:", componentTextHierarchy);
    
    // Define semantic classification mappings
    const semanticMappings: {[key: string]: string[]} = {
      'primary-text': ['primary'],
      'secondary-text': ['secondary'],
      'tertiary-text': ['tertiary'],
      'headline': ['primary', 'secondary'],
      'title': ['primary', 'secondary'],
      'content': ['primary', 'secondary'],
      'text': ['primary', 'secondary'],
      'supporting-text': ['secondary', 'tertiary'],
      'supporting': ['secondary', 'tertiary'],
      'subtitle': ['secondary', 'tertiary'],
      'trailing-text': ['tertiary', 'secondary'],
      'trailing': ['tertiary', 'secondary'],
      'caption': ['tertiary'],
      'overline': ['tertiary']
    };

    // Define legacy text mappings for backward compatibility
    const legacyMappings: {[key: string]: string[]} = {
      'content': ['headline', 'title', 'text', 'label'],
      'headline': ['headline', 'title', 'text', 'label'],
      'text': ['headline', 'title', 'text', 'label'],
      'supporting-text': ['supporting', 'subtitle', 'description', 'body'],
      'supporting': ['supporting', 'subtitle', 'description', 'body'],
      'trailing-text': ['trailing', 'value', 'action', 'status', 'end'],
      'trailing': ['trailing', 'value', 'action', 'status', 'end'],
      'title': ['title', 'headline', 'text'],
      'subtitle': ['subtitle', 'supporting', 'description']
    };
    
    for (const [propKey, propValue] of Object.entries(properties)) {
      if (!propValue || typeof propValue !== 'string' || !propValue.trim()) continue;
      
      // Exclude non-text properties (styles, icons, layout configs)
      const nonTextProperties = new Set([
        'horizontalSizing', 'variants', 'textStyle', 'colorStyleName',
        'leading-icon', 'trailing-icon', 'layoutAlign', 'layoutGrow'
      ]);
      
      if (nonTextProperties.has(propKey) || propKey.endsWith('Style') || propKey.includes('icon')) {
        continue;
      }
      
      console.log(`ðŸ”§ Trying to set ${propKey} = "${propValue}"`);
      
      let textNode: TextNode | null = null;
      let matchMethod = 'none';
      
      // Method 1: Try exact node name match from scan data
      if (componentTextHierarchy) {
        const hierarchyEntry = componentTextHierarchy.find(entry =>
          entry.nodeName.toLowerCase() === propKey.toLowerCase() ||
          entry.nodeName.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase()
        );
        
        if (hierarchyEntry) {
          textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
          if (textNode) {
            matchMethod = 'exact-name';
            console.log(`âœ… Found text node by exact name match: "${textNode.name}" (${hierarchyEntry.classification})`);
          } else {
            // Enhanced fallback: match by name when ID fails (for nested components)
            textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
            if (textNode) {
              matchMethod = 'name-fallback';
              console.log(`âœ… Found text node by name fallback: "${textNode.name}" (ID mismatch resolved)`);
            }
          }
        }
      }
      
      // Method 2: Try semantic classification match
      if (!textNode && componentTextHierarchy && semanticMappings[propKey.toLowerCase()]) {
        const targetClassifications = semanticMappings[propKey.toLowerCase()];
        
        for (const classification of targetClassifications) {
          const hierarchyEntry = componentTextHierarchy.find(entry =>
            entry.classification === classification
          );
          
          if (hierarchyEntry) {
            textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
            if (textNode) {
              matchMethod = 'semantic-classification';
              console.log(`âœ… Found text node by semantic classification: "${textNode.name}" (${classification})`);
              break;
            } else {
              // Enhanced fallback: match by name when ID fails (for nested components)
              textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
              if (textNode) {
                matchMethod = 'semantic-name-fallback';
                console.log(`âœ… Found text node by semantic name fallback: "${textNode.name}" (ID mismatch resolved)`);
                break;
              }
            }
          }
        }
      }
      
      // Method 3: Try partial node name match from scan data
      if (!textNode && componentTextHierarchy) {
        const hierarchyEntry = componentTextHierarchy.find(entry =>
          entry.nodeName.toLowerCase().includes(propKey.toLowerCase()) ||
          propKey.toLowerCase().includes(entry.nodeName.toLowerCase())
        );
        
        if (hierarchyEntry) {
          textNode = allTextNodes.find(n => n.id === hierarchyEntry.nodeId) || null;
          if (textNode) {
            matchMethod = 'partial-name';
            console.log(`âœ… Found text node by partial name match: "${textNode.name}"`);
          } else {
            // Enhanced fallback: match by name when ID fails (for nested components)
            textNode = allTextNodes.find(n => n.name === hierarchyEntry.nodeName) || null;
            if (textNode) {
              matchMethod = 'partial-name-fallback';
              console.log(`âœ… Found text node by partial name fallback: "${textNode.name}" (ID mismatch resolved)`);
            }
          }
        }
      }
      
      // Method 4: Fallback to legacy name-based matching
      if (!textNode) {
        const possibleNames = legacyMappings[propKey.toLowerCase()] || [propKey.toLowerCase()];
        
        for (const targetName of possibleNames) {
          textNode = allTextNodes.find(
            n => n.name.toLowerCase().includes(targetName.toLowerCase())
          ) || null;
          
          if (textNode) {
            matchMethod = 'legacy-mapping';
            console.log(`âœ… Found text node by legacy mapping: "${textNode.name}"`);
            break;
          }
        }
      }
      
      // Method 5: Position-based fallback
      if (!textNode) {
        if (propKey.toLowerCase().includes('headline') || propKey.toLowerCase().includes('title') || propKey.toLowerCase().includes('primary')) {
          textNode = allTextNodes[0] || null;
          matchMethod = 'position-first';
          console.log(`ðŸ”„ Using first text node as fallback for "${propKey}"`);
        } else if (propKey.toLowerCase().includes('trailing') || propKey.toLowerCase().includes('tertiary')) {
          textNode = allTextNodes[allTextNodes.length - 1] || null;
          matchMethod = 'position-last';
          console.log(`ðŸ”„ Using last text node as fallback for "${propKey}"`);
        } else if (propKey.toLowerCase().includes('supporting') || propKey.toLowerCase().includes('secondary')) {
          textNode = allTextNodes[1] || allTextNodes[0] || null;
          matchMethod = 'position-second';
          console.log(`ðŸ”„ Using second text node as fallback for "${propKey}"`);
        }
      }
      
      // Apply the text and activate hidden nodes if needed
      if (textNode) {
        try {
          // Activate hidden text node if needed
          if (!textNode.visible) {
            textNode.visible = true;
            console.log(`ðŸ‘ï¸ Activated hidden text node: "${textNode.name}"`);
          }
          
          // Load font and set text
          if (typeof textNode.fontName !== 'symbol') {
            await figma.loadFontAsync(textNode.fontName as FontName);
            textNode.characters = propValue;
            console.log(`âœ… Successfully set "${textNode.name}" to "${propValue}" (method: ${matchMethod})`);
          }
        } catch (fontError) {
          console.error(`âŒ Font loading failed for "${textNode.name}":`, fontError);
        }
      } else {
        console.warn(`âŒ No text node found for property "${propKey}" with value "${propValue}"`);
      }
    }
  }

  /**
   * Get text hierarchy data for a component instance from scan results
   */
  static async getComponentTextHierarchy(instance: InstanceNode): Promise<TextHierarchy[] | null> {
    try {
      // Get the main component to find its scan data
      const mainComponent = await instance.getMainComponentAsync();
      if (!mainComponent) return null;
      
      // Get scan results from storage
      const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
      if (!scanResults || !Array.isArray(scanResults)) return null;
      
      // Find the component in scan results
      const componentInfo = scanResults.find(comp => comp.id === mainComponent.id);
      return componentInfo?.textHierarchy || null;
      
    } catch (error) {
      console.warn("Could not get text hierarchy data:", error);
      return null;
    }
  }

  /**
   * Apply media properties to component instances using enhanced scan data validation
   */
  static async applyMediaProperties(instance: InstanceNode, properties: any): Promise<void> {
    if (!properties) return;
    
    console.log("ðŸ–¼ï¸ Validating media properties:", properties);
    
    // Get the component's media structure from scan data
    const componentMediaData = await this.getComponentMediaData(instance);
    console.log("ðŸ–¼ï¸ Media data from scan results:", componentMediaData);
    
    // Define media property patterns to look for
    const mediaPropertyPatterns = [
      'icon', 'image', 'avatar', 'photo', 'logo', 'media',
      'leading-icon', 'trailing-icon', 'start-icon', 'end-icon',
      'profile-image', 'user-avatar', 'cover-image', 'thumbnail'
    ];
    
    // Extract media-related properties
    const mediaProperties: {[key: string]: any} = {};
    Object.entries(properties).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      if (mediaPropertyPatterns.some(pattern => keyLower.includes(pattern))) {
        mediaProperties[key] = value;
      }
    });
    
    if (Object.keys(mediaProperties).length === 0) {
      console.log("ðŸ–¼ï¸ No media properties found to validate");
      return;
    }
    
    console.log("ðŸ–¼ï¸ Found media properties to validate:", Object.keys(mediaProperties));
    
    // Validate each media property against scan data
    for (const [propKey, propValue] of Object.entries(mediaProperties)) {
      if (!propValue || typeof propValue !== 'string' || !propValue.trim()) continue;
      
      console.log(`ðŸ” Validating media property: ${propKey} = "${propValue}"`);
      
      let validationResult = this.validateMediaProperty(propKey, propValue, componentMediaData);
      
      if (validationResult.isValid) {
        console.log(`âœ… ${propKey} â†’ would set to "${propValue}" (${validationResult.targetType}: "${validationResult.targetName}")`);
      } else {
        console.warn(`âŒ Invalid media property: "${propKey}" = "${propValue}" - ${validationResult.reason}`);
        
        // Suggest alternatives if available
        if (validationResult.suggestions?.length) {
          console.log(`ðŸ’¡ Available media slots: ${validationResult.suggestions.join(', ')}`);
        }
      }
    }
  }

  /**
   * Get media structure data for a component instance from scan results
   */
  static async getComponentMediaData(instance: InstanceNode): Promise<{
    componentInstances: ComponentInstance[],
    vectorNodes: VectorNode[],
    imageNodes: ImageNode[]
  } | null> {
    try {
      // Get the main component to find its scan data
      const mainComponent = await instance.getMainComponentAsync();
      if (!mainComponent) {
        console.warn("Could not get main component from instance");
        return null;
      }
      
      console.log("ðŸ” Looking for media data for main component ID:", mainComponent.id);
      
      // Get scan results from storage
      const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
      if (!scanResults || !Array.isArray(scanResults)) {
        console.warn("No scan results found in storage");
        return null;
      }
      
      console.log("ðŸ” Available component IDs in scan data:", scanResults.map(c => c.id));
      
      // Find the component in scan results
      const componentInfo = scanResults.find(comp => comp.id === mainComponent.id);
      if (!componentInfo) {
        console.warn(`Component ${mainComponent.id} not found in scan results`);
        return null;
      }
      
      console.log("ðŸ” Found component info:", componentInfo.name);
      console.log("ðŸ” Component instances:", componentInfo.componentInstances);
      console.log("ðŸ” Vector nodes:", componentInfo.vectorNodes);
      console.log("ðŸ” Image nodes:", componentInfo.imageNodes);
      
      return {
        componentInstances: componentInfo.componentInstances || [],
        vectorNodes: componentInfo.vectorNodes || [],
        imageNodes: componentInfo.imageNodes || []
      };
      
    } catch (error) {
      console.warn("Could not get media data:", error);
      return null;
    }
  }

  /**
   * Validate a media property against available media slots in scan data
   */
  static validateMediaProperty(propKey: string, propValue: string, mediaData: {
    componentInstances: ComponentInstance[],
    vectorNodes: VectorNode[],
    imageNodes: ImageNode[]
  } | null): {
    isValid: boolean,
    targetType?: 'component-instance' | 'vector-node' | 'image-node',
    targetName?: string,
    reason?: string,
    suggestions?: string[]
  } {
    if (!mediaData) {
      return {
        isValid: false,
        reason: "No media scan data available"
      };
    }
    
    const { componentInstances, vectorNodes, imageNodes } = mediaData;
    
    // Create a list of all available media slots
    const allMediaSlots = [
      ...componentInstances.map(c => ({ name: c.nodeName, type: 'component-instance' as const })),
      ...vectorNodes.map(v => ({ name: v.nodeName, type: 'vector-node' as const })),
      ...imageNodes.map(i => ({ name: i.nodeName, type: 'image-node' as const }))
    ];
    
    if (allMediaSlots.length === 0) {
      return {
        isValid: false,
        reason: "No media slots found in component"
      };
    }
    
    // Try exact name match
    const exactMatch = allMediaSlots.find(slot =>
      slot.name.toLowerCase() === propKey.toLowerCase() ||
      slot.name.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase()
    );
    
    if (exactMatch) {
      return {
        isValid: true,
        targetType: exactMatch.type,
        targetName: exactMatch.name
      };
    }
    
    // Try partial name match
    const partialMatch = allMediaSlots.find(slot =>
      slot.name.toLowerCase().includes(propKey.toLowerCase()) ||
      propKey.toLowerCase().includes(slot.name.toLowerCase())
    );
    
    if (partialMatch) {
      return {
        isValid: true,
        targetType: partialMatch.type,
        targetName: partialMatch.name
      };
    }
    
    // Try semantic matching based on property type
    const semanticMatch = this.findSemanticMediaMatch(propKey, allMediaSlots);
    if (semanticMatch) {
      return {
        isValid: true,
        targetType: semanticMatch.type,
        targetName: semanticMatch.name
      };
    }
    
    // Return suggestions for invalid properties
    return {
      isValid: false,
      reason: `No matching media slot found for "${propKey}"`,
      suggestions: allMediaSlots.map(slot => slot.name)
    };
  }

  /**
   * Find semantic matches for media properties using intelligent classification
   */
  static findSemanticMediaMatch(propKey: string, mediaSlots: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>): {name: string, type: 'component-instance' | 'vector-node' | 'image-node'} | null {
    const keyLower = propKey.toLowerCase();
    
    // Enhanced semantic classification with multiple strategies
    const classifications = this.classifyMediaSlots(mediaSlots);
    
    // Strategy 1: Direct semantic category matching
    if (keyLower.includes('avatar') || keyLower.includes('profile') || keyLower.includes('user')) {
      return classifications.avatars[0] || classifications.images[0] || classifications.circles[0] || null;
    }
    
    if (keyLower.includes('icon') && !keyLower.includes('leading') && !keyLower.includes('trailing')) {
      return classifications.icons[0] || classifications.vectors[0] || classifications.smallImages[0] || null;
    }
    
    if (keyLower.includes('image') || keyLower.includes('photo') || keyLower.includes('picture')) {
      return classifications.images[0] || classifications.rectangularImages[0] || classifications.avatars[0] || null;
    }
    
    if (keyLower.includes('logo') || keyLower.includes('brand')) {
      return classifications.logos[0] || classifications.vectors[0] || classifications.images[0] || null;
    }
    
    if (keyLower.includes('badge') || keyLower.includes('indicator') || keyLower.includes('status')) {
      return classifications.badges[0] || classifications.smallImages[0] || classifications.vectors[0] || null;
    }
    
    // Strategy 2: Position-based matching
    if (keyLower.includes('leading') || keyLower.includes('start') || keyLower.includes('left')) {
      const positionMatch = this.findByPosition(mediaSlots, 'leading');
      if (positionMatch) return positionMatch;
      
      // Fallback to any icon/vector for leading positions
      return classifications.icons[0] || classifications.vectors[0] || null;
    }
    
    if (keyLower.includes('trailing') || keyLower.includes('end') || keyLower.includes('right')) {
      const positionMatch = this.findByPosition(mediaSlots, 'trailing');
      if (positionMatch) return positionMatch;
      
      // Fallback to any icon/vector for trailing positions
      return classifications.icons[0] || classifications.vectors[0] || null;
    }
    
    // Strategy 3: Size-based matching
    if (keyLower.includes('large') || keyLower.includes('big') || keyLower.includes('cover')) {
      return classifications.largeImages[0] || classifications.images[0] || null;
    }
    
    if (keyLower.includes('small') || keyLower.includes('mini') || keyLower.includes('thumb')) {
      return classifications.smallImages[0] || classifications.icons[0] || classifications.vectors[0] || null;
    }
    
    // Strategy 4: Fallback based on property type patterns
    if (keyLower.includes('icon')) {
      return classifications.vectors[0] || classifications.icons[0] || null;
    }
    
    return null;
  }
  
  /**
   * Classify media slots into semantic categories based on names and types
   */
  static classifyMediaSlots(mediaSlots: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>): {
    avatars: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    icons: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    images: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    vectors: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    badges: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    logos: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    smallImages: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    largeImages: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    circles: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
    rectangularImages: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>
  } {
    const classifications = {
      avatars: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      icons: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      images: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      vectors: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      badges: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      logos: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      smallImages: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      largeImages: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      circles: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>,
      rectangularImages: [] as Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>
    };
    
    mediaSlots.forEach(slot => {
      const nameLower = slot.name.toLowerCase();
      
      // Avatar classification - look for people, faces, profiles
      if (nameLower.includes('avatar') ||
          nameLower.includes('profile') ||
          nameLower.includes('user') ||
          nameLower.includes('person') ||
          nameLower.includes('selfie') ||
          nameLower.includes('face') ||
          nameLower.includes('man') ||
          nameLower.includes('woman') ||
          nameLower.includes('people') ||
          (slot.type === 'image-node' && nameLower.includes('photo'))) {
        classifications.avatars.push(slot);
      }
      
      // Icon classification - small graphics, symbols
      else if (nameLower.includes('icon') ||
               nameLower.includes('symbol') ||
               nameLower.includes('pictogram') ||
               (slot.type === 'vector-node' && nameLower.length < 10)) {
        classifications.icons.push(slot);
      }
      
      // Badge classification - status indicators, notifications
      else if (nameLower.includes('badge') ||
               nameLower.includes('indicator') ||
               nameLower.includes('status') ||
               nameLower.includes('notification') ||
               nameLower.includes('dot') ||
               nameLower.includes('alert')) {
        classifications.badges.push(slot);
      }
      
      // Logo classification - brand elements
      else if (nameLower.includes('logo') ||
               nameLower.includes('brand') ||
               nameLower.includes('company')) {
        classifications.logos.push(slot);
      }
      
      // Vector classification - all vector nodes
      else if (slot.type === 'vector-node') {
        classifications.vectors.push(slot);
      }
      
      // Image classification - all image nodes and component instances with image-like names
      else if (slot.type === 'image-node' ||
               nameLower.includes('image') ||
               nameLower.includes('picture') ||
               nameLower.includes('photo')) {
        classifications.images.push(slot);
        
        // Sub-classify by apparent size/shape
        if (nameLower.includes('small') || nameLower.includes('mini') || nameLower.includes('thumb')) {
          classifications.smallImages.push(slot);
        } else if (nameLower.includes('large') || nameLower.includes('big') || nameLower.includes('cover')) {
          classifications.largeImages.push(slot);
        }
        
        // Shape classification
        if (nameLower.includes('circle') || nameLower.includes('round')) {
          classifications.circles.push(slot);
        } else {
          classifications.rectangularImages.push(slot);
        }
      }
      
      // Catch-all for component instances
      else if (slot.type === 'component-instance') {
        // If no specific category, put in general images category
        classifications.images.push(slot);
      }
    });
    
    return classifications;
  }
  
  /**
   * Find media slots by position keywords
   */
  static findByPosition(mediaSlots: Array<{name: string, type: 'component-instance' | 'vector-node' | 'image-node'}>, position: 'leading' | 'trailing'): {name: string, type: 'component-instance' | 'vector-node' | 'image-node'} | null {
    const positionKeywords = position === 'leading'
      ? ['leading', 'start', 'left', 'first', 'begin']
      : ['trailing', 'end', 'right', 'last', 'final'];
    
    return mediaSlots.find(slot =>
      positionKeywords.some(keyword =>
        slot.name.toLowerCase().includes(keyword)
      )
    ) || null;
  }

  /**
   * Sanitize and clean property names and values
   */
  static sanitizeProperties(properties: any): any {
    if (!properties) return {};
    
    return Object.entries(properties).reduce((acc: {[key: string]: any}, [key, value]) => {
      const cleanKey = key.replace(/\s+/g, '-');
      if (key.toLowerCase().includes('text') && value !== null && value !== undefined) {
        acc[cleanKey] = String(value);
      } else {
        acc[cleanKey] = value;
      }
      return acc;
    }, {});
  }

  /**
   * Separate variant properties from regular properties
   */
  static separateVariantsFromProperties(properties: any, componentId: string): {cleanProperties: any, variants: any} {
    if (!properties) return {cleanProperties: {}, variants: {}};
    
    const cleanProperties: any = {};
    const variants: any = {};
    
    const knownTextProperties = ['text', 'supporting-text', 'trailing-text', 'headline', 'subtitle', 'value'];
    const knownLayoutProperties = ['horizontalSizing', 'verticalSizing', 'layoutAlign', 'layoutGrow'];
    
    const variantPropertyNames = [
      'condition', 'Condition',
      'leading', 'Leading',
      'trailing', 'Trailing',
      'state', 'State',
      'style', 'Style',
      'size', 'Size',
      'type', 'Type',
      'emphasis', 'Emphasis',
      'variant', 'Variant'
    ];
    
    Object.entries(properties).forEach(([key, value]) => {
      if (key === 'variants') {
        Object.assign(variants, value);
        console.log(`ðŸ”§ Found existing variants object:`, value);
        return;
      }
      
      if (knownTextProperties.some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
        cleanProperties[key] = value;
        return;
      }
      
      if (knownLayoutProperties.some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
        cleanProperties[key] = value;
        return;
      }
      
      if (variantPropertyNames.includes(key)) {
        const properKey = key.charAt(0).toUpperCase() + key.slice(1);
        variants[properKey] = value;
        console.log(`ðŸ”§ Moved "${key}" -> "${properKey}" from properties to variants`);
        return;
      }
      
      cleanProperties[key] = value;
    });
    
    console.log(`ðŸ” Final separation for ${componentId}:`);
    console.log(`   Clean properties:`, cleanProperties);
    console.log(`   Variants:`, variants);
    
    return {cleanProperties, variants};
  }

  /**
   * Apply child layout properties for auto-layout items
   */
  static applyChildLayoutProperties(node: SceneNode, properties: any): void {
    if (!properties || !node) return;
    
    console.log('ðŸ”¥ CODE DEPLOYMENT TEST - APPLYING CHILD LAYOUT PROPERTIES:', {
      nodeType: node.type,
      properties: properties,
      DEPLOYMENT_TEST: 'August 12 - If you see this, code is deployed'
    });
    
    console.log('ðŸ”¥ðŸ”¥ðŸ”¥ BEFORE SIZING MODE LOGIC:', {
      primaryAxisSizingMode: (node as any).primaryAxisSizingMode,
      counterAxisSizingMode: (node as any).counterAxisSizingMode,
      layoutMode: (node as any).layoutMode,
      height: (node as any).height
    });
    
    // Check if node is a frame that supports auto-layout
    if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
      console.warn('âš ï¸ Node type does not support layout properties:', node.type);
      return;
    }
    
    const frame = node as FrameNode;
    
    // Handle horizontalSizing: "FILL"
    if (properties.horizontalSizing === 'FILL') {
      const parent = frame.parent;
      
      if (parent && 'layoutMode' in parent) {
        const parentFrame = parent as FrameNode;
        
        if (parentFrame.layoutMode === 'VERTICAL') {
          // In vertical layout, FILL means stretch horizontally
          try {
            // Set the frame to stretch to parent width
            frame.layoutAlign = properties.layoutAlign || 'STRETCH';
            
            // CRITICAL: Don't set width - let auto-layout handle it
            // Instead, ensure the sizing mode allows stretching
            if (frame.layoutMode !== 'NONE') {
              // This is an auto-layout frame
              frame.counterAxisSizingMode = 'FIXED';
              frame.primaryAxisSizingMode = 'AUTO';
            }
            
            console.log('âœ… Applied FILL for VERTICAL parent - set layoutAlign to STRETCH');
          } catch (e) {
            console.error('âŒ Failed to apply FILL sizing:', e);
          }
        } else if (parentFrame.layoutMode === 'HORIZONTAL') {
          // In horizontal layout, FILL means grow to fill available space
          try {
            frame.layoutGrow = 1;
            frame.layoutAlign = 'STRETCH';  // Force STRETCH for FILL, ignore layoutAlign
            
            if (frame.layoutMode !== 'NONE') {
              // FIXED: For horizontal containers, primary axis (width) should be FIXED to allow growth
              frame.primaryAxisSizingMode = 'FIXED';  // Width grows with layoutGrow
              frame.counterAxisSizingMode = 'AUTO';   // Height hugs content
            }
            
            console.log('âœ… Applied FILL for HORIZONTAL parent - set layoutGrow to 1 and layoutAlign to STRETCH');
          } catch (e) {
            console.error('âŒ Failed to apply FILL sizing:', e);
          }
        }
      }
    } else if (properties.horizontalSizing === 'HUG' || properties.horizontalSizing === 'AUTO') {
      // HUG/AUTO means size to content
      try {
        if (frame.layoutMode !== 'NONE') {
          frame.primaryAxisSizingMode = 'AUTO';
          frame.counterAxisSizingMode = 'AUTO';
        }
        console.log('âœ… Applied HUG/AUTO sizing');
      } catch (e) {
        console.error('âŒ Failed to apply HUG sizing:', e);
      }
    }
    
    // Apply layoutAlign if specified (and not already set above)
    if (properties.layoutAlign && !properties.horizontalSizing) {
      try {
        frame.layoutAlign = properties.layoutAlign;
        console.log('âœ… Set layoutAlign:', properties.layoutAlign);
      } catch (e) {
        console.warn('âš ï¸ Failed to set layoutAlign:', e);
      }
    }
    
    // Apply layoutGrow if explicitly specified
    if (properties.layoutGrow !== undefined && properties.layoutGrow !== null) {
      try {
        frame.layoutGrow = properties.layoutGrow;
        console.log('âœ… Set layoutGrow:', properties.layoutGrow);
      } catch (e) {
        console.warn('âš ï¸ Failed to set layoutGrow:', e);
      }
    }
    
    // Apply other layout properties
    if (properties.layoutPositioning) {
      try {
        frame.layoutPositioning = properties.layoutPositioning;
        console.log('âœ… Set layoutPositioning:', properties.layoutPositioning);
      } catch (e) {
        console.warn('âš ï¸ Failed to set layoutPositioning:', e);
      }
    }
    
    // CRITICAL FIX: Apply sizing modes directly for containers
    // Apply layout mode first if provided
    if (properties.layoutMode && properties.layoutMode !== frame.layoutMode) {
      try {
        frame.layoutMode = properties.layoutMode;
        console.log('âœ… Set child layoutMode:', properties.layoutMode);
      } catch (e) {
        console.error('âŒ Failed to set layoutMode:', e);
      }
    }
    
    // Apply sizing modes regardless of layoutMode (they should work independently)
    if (properties.primaryAxisSizingMode || properties.counterAxisSizingMode) {
      try {
        if (properties.primaryAxisSizingMode) {
          frame.primaryAxisSizingMode = properties.primaryAxisSizingMode;
          console.log('âœ… Set child primaryAxisSizingMode:', properties.primaryAxisSizingMode);
        }
        
        if (properties.counterAxisSizingMode) {
          frame.counterAxisSizingMode = properties.counterAxisSizingMode;
          console.log('âœ… Set child counterAxisSizingMode:', properties.counterAxisSizingMode);
        }
      } catch (e) {
        console.error('âŒ Failed to apply sizing modes:', e);
      }
    }
    
    console.log('ðŸ”¥ðŸ”¥ðŸ”¥ AFTER ALL LOGIC:', {
      primaryAxisSizingMode: (node as any).primaryAxisSizingMode,
      counterAxisSizingMode: (node as any).counterAxisSizingMode,
      layoutMode: (node as any).layoutMode,
      height: (node as any).height
    });
  }

  /**
   * Enhanced systematic component creation with modern API
   */
  static async createComponentInstanceSystematic(item: any, container: FrameNode): Promise<void> {
    if (!item.componentNodeId) return;

    let componentNode;
    try {
      componentNode = await figma.getNodeByIdAsync(item.componentNodeId);
    } catch (nodeError) {
      console.error(`âŒ Error accessing component ${item.componentNodeId}:`, nodeError.message);
      await this.createMissingComponentPlaceholder(item.componentNodeId, container);
      return;
    }
    
    if (!componentNode) {
      console.warn(`âš ï¸ Component with ID ${item.componentNodeId} not found. Skipping.`);
      await this.createMissingComponentPlaceholder(item.componentNodeId, container);
      return;
    }
    
    const masterComponent = (componentNode.type === 'COMPONENT_SET'
      ? componentNode.defaultVariant
      : componentNode) as ComponentNode | null;
      
    if (!masterComponent || masterComponent.type !== 'COMPONENT') {
      console.warn(`âš ï¸ Could not find a valid master component for ID ${item.componentNodeId}. Skipping.`);
      return;
    }

    console.log(` Creating systematic instance: ${masterComponent.name}`);

    // SYSTEMATIC VALIDATION - Merge properties and variants
    const allProperties = {
      ...item.properties || {},
      variants: item.variants || {}
    };
    
    const validationResult = ComponentPropertyEngine.validateAndProcessProperties(
      item.componentNodeId,
      allProperties
    );

    if (validationResult.warnings.length > 0) {
      console.warn(`âš ï¸ Warnings:`, validationResult.warnings);
    }
    if (validationResult.errors.length > 0) {
      console.error(`âŒ Validation errors:`, validationResult.errors);
      
      // Create LLM-friendly error message
      const llmErrors = validationResult.errors.map(err =>
        `${err.message}${err.suggestion ? ` - ${err.suggestion}` : ''}${err.llmHint ? ` (${err.llmHint})` : ''}`
      ).join('\n');
      
      console.error(` LLM Error Summary:\n${llmErrors}`);
    }

    const { variants, textProperties, mediaProperties, layoutProperties } = validationResult.processedProperties;

    console.log('ðŸ”§ VALIDATION RESULTS:', {
      originalVariants: item.variants,
      processedVariants: variants,
      variantCount: Object.keys(variants).length
    });

    // Create and configure instance
    let instance;
    try {
      instance = masterComponent.createInstance();
      container.appendChild(instance);
    } catch (createError) {
      console.error(`âŒ Error creating instance of ${masterComponent.name}:`, createError.message);
      // Create a placeholder instead
      await this.createMissingComponentPlaceholder(item.componentNodeId, container);
      return;
    }

    // Apply properties in correct order with error handling
    try {
      if (Object.keys(variants).length > 0) {
        console.log('âœ… About to apply variants:', variants);
        await this.applyVariantsSystematic(instance, variants, componentNode);
      } else {
        console.log('âš ï¸ NO VARIANTS TO APPLY - variants object is empty');
      }
    } catch (variantError) {
      console.error(`âŒ Error applying variants to ${masterComponent.name}:`, variantError.message);
    }
    
    try {
      this.applyChildLayoutProperties(instance, layoutProperties);
    } catch (layoutError) {
      console.error(`âŒ Error applying layout properties to ${masterComponent.name}:`, layoutError.message);
    }
    
    try {
      if (Object.keys(textProperties).length > 0) {
        await this.applyTextPropertiesSystematic(instance, textProperties, item.componentNodeId);
      }
    } catch (textError) {
      console.error(`âŒ Error applying text properties to ${masterComponent.name}:`, textError.message);
    }
    
    try {
      if (Object.keys(mediaProperties).length > 0) {
        await this.applyMediaPropertiesSystematic(instance, mediaProperties, item.componentNodeId);
      }
    } catch (mediaError) {
      console.error(`âŒ Error applying media properties to ${masterComponent.name}:`, mediaError.message);
    }
    
    // Apply visibility overrides and icon swaps at the very end after all other properties
    try {
      await this.applyVisibilityOverrides(instance, item);
    } catch (visibilityError) {
      console.error(`âŒ Error applying visibility overrides to ${masterComponent.name}:`, visibilityError.message);
    }
    
    // Apply icon swaps AFTER everything else is rendered
    try {
      if (item.iconSwaps) {
        await this.applyIconSwaps(instance, item.iconSwaps);
      }
    } catch (iconError) {
      console.error(`âŒ Error applying icon swaps to ${masterComponent.name}:`, iconError.message);
    }
  }

  /**
   * Apply variants with modern Component Properties API
   */
  static async applyVariantsSystematic(instance: InstanceNode, variants: any, componentNode: any): Promise<void> {
    console.log('ðŸŽ¨ VARIANT APPLICATION START', {
      variants,
      componentType: componentNode?.type,
      instanceName: instance.name
    });
    
    try {
      await PerformanceTracker.track('apply-variants', async () => {
        if (componentNode && componentNode.type === 'COMPONENT_SET') {
          // Use modern componentPropertyDefinitions
          const propertyDefinitions = componentNode.componentPropertyDefinitions;
          
          if (!propertyDefinitions) {
            console.warn('âš ï¸ No component property definitions found');
            return;
          }

          const validVariants: { [key: string]: string } = {};
          
          Object.entries(variants).forEach(([propName, propValue]) => {
            const propertyDef = propertyDefinitions[propName];
            if (propertyDef && propertyDef.type === 'VARIANT') {
              // Convert boolean values to capitalized strings for Figma
              let stringValue: string;
              if (typeof propValue === 'boolean') {
                stringValue = propValue ? 'True' : 'False';
                console.log(`ðŸ”„ Boolean conversion: ${propName} = ${propValue} -> "${stringValue}"`);
              } else {
                stringValue = String(propValue);
              }
              
              if (propertyDef.variantOptions && propertyDef.variantOptions.includes(stringValue)) {
                validVariants[propName] = stringValue;
                console.log(`âœ… Valid variant: ${propName} = "${stringValue}"`);
              } else {
                console.warn(`âš ï¸ Invalid value for "${propName}": "${stringValue}". Available: [${propertyDef.variantOptions?.join(', ') || ''}]`);
              }
            } else {
              console.warn(`âš ï¸ Unknown variant property: "${propName}"`);
            }
          });
          
          if (Object.keys(validVariants).length > 0) {
            instance.setProperties(validVariants);
            console.log('âœ… Variants applied successfully');
          }
        }
      });
    } catch (e) {
      console.error("âŒ Error applying variants:", e);
    }
  }

  /**
   * Apply visibility overrides to component child elements
   */
  private static async applyVisibilityOverrides(instance: InstanceNode, itemData: any): Promise<void> {
    console.log('ðŸ› applyVisibilityOverrides CALLED', {
      hasOverrides: !!itemData.visibilityOverrides,
      hasIconSwaps: !!itemData.iconSwaps,
      overrideCount: Object.keys(itemData.visibilityOverrides || {}).length,
      iconSwapCount: Object.keys(itemData.iconSwaps || {}).length,
      instanceName: instance.name,
      instanceId: instance.id,
      itemType: itemData.type
    });

    if (!itemData.visibilityOverrides && !itemData.iconSwaps) {
      console.log('ðŸ› No overrides to apply, returning early');
      return;
    }
    
    // Log all instance children for debugging
    console.log('ðŸ› Instance children:', instance.children.map(child => ({
      name: child.name,
      id: child.id,
      type: child.type,
      visible: child.visible
    })));
    
    try {
      // Apply visibility overrides
      if (itemData.visibilityOverrides) {
        console.log('ðŸ› Processing visibility overrides:', itemData.visibilityOverrides);
        Object.entries(itemData.visibilityOverrides).forEach(([nodeId, visible]) => {
          console.log(`ðŸ› Looking for node ${nodeId} to set visibility to ${visible}`);
          
          // Try exact match first
          let child = instance.findChild(node => node.id === nodeId);
          
          // If not found, try matching by base node ID (handles instance-prefixed IDs)
          if (!child) {
            console.log(`ðŸ› Exact match failed, trying base node ID matching for ${nodeId}`);
            
            // First try direct children
            child = instance.findChild(node => node.id.endsWith(nodeId) || node.id.includes(nodeId));
            
            // If still not found, search recursively through all descendants
            if (!child) {
              console.log(`ðŸ› Direct child search failed, searching all descendants for ${nodeId}`);
              try {
                child = instance.findAll(node => node.id.includes(nodeId))[0];
                if (child) {
                  console.log(`ðŸ› Found in descendants: ${child.id} (${child.name})`);
                }
              } catch (findAllError) {
                console.warn(`ðŸ› findAll search failed:`, findAllError);
              }
            }
          }
          
          if (child) {
            try {
              const previousVisible = child.visible;
              child.visible = visible as boolean;
              // Safely access name property
              const childName = child.name || 'unnamed';
              console.log(`âœ… Applied visibility override: ${nodeId} = ${visible} (was: ${previousVisible}, name: ${childName}, actualId: ${child.id})`);
            } catch (nodeError) {
              console.warn(`âš ï¸ Error accessing node ${nodeId}:`, nodeError);
              console.warn(`ðŸ› Node may have been invalidated during component instantiation`);
            }
          } else {
            console.warn(`âš ï¸ Child node ${nodeId} not found for visibility override`);
            console.warn(`ðŸ› Available node IDs:`, instance.children.map(c => c.id));
          }
        });
      }

      
      console.log('ðŸ› applyVisibilityOverrides completed successfully');
    } catch (error) {
      console.error('âŒ Visibility override application failed:', error);
    }
  }

  /**
   * Simple icon resolution using existing design system structure
   */
  private static resolveIcon(iconName: string, designSystemData: any): string | null {
    if (!designSystemData?.components) {
      console.warn('âš ï¸ No design system data available for icon resolution');
      return null;
    }
    
    console.log(`ðŸ” Resolving icon "${iconName}" from ${designSystemData.components.length} components`);
    console.log(`ðŸ” Available icons:`, designSystemData.components
      .filter(comp => comp.suggestedType === 'icon')
      .map(comp => `${comp.name} (${comp.id})`)
    );
    
    const iconComponent = designSystemData.components.find(comp =>
      comp.suggestedType === 'icon' &&
      comp.name.toLowerCase().includes(iconName.toLowerCase())
    );
    
    if (iconComponent) {
      console.log(`âœ… Resolved icon "${iconName}" â†’ ${iconComponent.id} (${iconComponent.name})`);
      return iconComponent.id;
    }
    
    console.warn(`âŒ Icon "${iconName}" not found in design system`);
    return null;
  }

  // Static field to store design system data for this rendering session
  private static currentDesignSystemData: any = null;
  
  /**
   * Get cached design system data for icon resolution
   */
  private static getCachedDesignSystemData(): any {
    if (!this.currentDesignSystemData) {
      console.warn('âš ï¸ No design system data available for icon resolution');
      return null;
    }
    console.log('âœ… Using design system data with', this.currentDesignSystemData?.components?.length || 0, 'components');
    return this.currentDesignSystemData;
  }
  
  /**
   * Set design system data for the current rendering session
   */
  private static setDesignSystemData(data: any): void {
    this.currentDesignSystemData = data;
    console.log('ðŸ“‹ Design system data loaded for rendering:', data?.components?.length || 0, 'components');
  }

  /**
   * Apply icon swaps after component rendering is complete
   */
  private static async applyIconSwaps(instance: InstanceNode, iconSwaps: Record<string, string>): Promise<void> {
    console.log('ðŸ”„ Applying icon swaps AFTER rendering:', iconSwaps);
    const designSystemData = this.getCachedDesignSystemData();
    
    // Get component schema to understand the structure
    let schema = null;
    let componentId = null;
    
    try {
      const mainComponent = await instance.getMainComponentAsync();
      componentId = mainComponent?.id;
      if (componentId) {
        schema = ComponentPropertyEngine.getComponentSchema(componentId);
        if (schema) {
          console.log(`ðŸ“‹ Using schema for component ${componentId}:`, schema);
        } else {
          console.warn(`âš ï¸ No schema found for component ${componentId}`);
        }
      } else {
        console.warn(`âš ï¸ No main component found for instance`);
      }
    } catch (error) {
      console.warn(`âš ï¸ Error getting main component:`, error);
    }
    
    for (const [nodeId, iconName] of Object.entries(iconSwaps)) {
      console.log(`ðŸ”„ Icon swap: ${nodeId} â†’ ${iconName}`);
      
      let targetInstance: InstanceNode | null = null;
      
      // Strategy 1: Use schema to find component instances
      if (schema && schema.componentInstances) {
        console.log(`ðŸ“‹ Schema-based search for "${nodeId}"...`);
        console.log(`ðŸ“‹ Available componentInstances:`, schema.componentInstances);
        
        // Look for matching component instances in schema
        for (const compInstance of schema.componentInstances) {
          const instName = compInstance.nodeName.toLowerCase();
          const instId = compInstance.nodeId;
          
          console.log(`ðŸ“‹ Checking schema instance: ${compInstance.nodeName} (${instId})`);
          
          // Try to match by semantic name
          if (nodeId.includes('leading') && instName.includes('leading')) {
            // Find this instance in the actual rendered component
            try {
              const foundNode = instance.findChild(node => node.id === instId) ||
                               instance.findAll(node => node.id.includes(instId))[0];
              
              if (foundNode && foundNode.type === 'INSTANCE') {
                targetInstance = foundNode as InstanceNode;
                console.log(`ðŸ“‹ Found leading instance via schema: ${foundNode.name} (${foundNode.id})`);
                break;
              } else if (foundNode) {
                // If it's a container (like "Leading element"), search inside it for icons
                console.log(`ðŸ“‹ Found container "${foundNode.name}", searching for icon instances inside...`);
                try {
                  const iconInstances = (foundNode as any).findAll?.((n: any) => n.type === 'INSTANCE') || [];
                  if (iconInstances.length > 0) {
                    targetInstance = iconInstances[0] as InstanceNode;
                    console.log(`ðŸ“‹ Found icon inside container: ${targetInstance.name} (${targetInstance.id})`);
                    break;
                  }
                } catch (nestedError) {
                  console.warn(`ðŸ“‹ Error searching inside container:`, nestedError);
                }
              }
            } catch (error) {
              console.warn(`ðŸ“‹ Error finding schema instance ${instId}:`, error);
            }
          }
        }
      }
      
      // Strategy 2: Fallback semantic search if schema didn't work
      if (!targetInstance) {
        console.log(`ðŸ” Fallback search for "${nodeId}"...`);
        try {
          // First, let's see what ALL children look like
          console.log(`ðŸ” All children of ${instance.name}:`, instance.children.map(child => ({
            name: child.name,
            type: child.type,
            id: child.id
          })));
          
          const allInstances = instance.findAll(node => node.type === 'INSTANCE') as InstanceNode[];
          console.log(`ðŸ” Found ${allInstances.length} total instances in component`);
          
          for (const inst of allInstances) {
            const instName = inst.name.toLowerCase();
            console.log(`ðŸ” Checking instance: ${inst.name} (${inst.id})`);
            
            // Check if this instance matches our semantic search
            if (nodeId.includes('leading') && instName.includes('leading')) {
              targetInstance = inst;
              console.log(`ðŸ” Found by semantic match: ${inst.name}`);
              break;
            } else if (nodeId.includes('trailing') && instName.includes('trailing')) {
              targetInstance = inst;
              console.log(`ðŸ” Found by semantic match: ${inst.name}`);
              break;
            } else if (nodeId.includes('icon') && instName.includes('icon')) {
              targetInstance = inst;
              console.log(`ðŸ” Found by semantic match: ${inst.name}`);
              break;
            }
          }
          
          // If semantic search failed, let's try to find any instances that might be icons
          if (!targetInstance && allInstances.length > 0) {
            console.log(`ðŸ” No semantic match, checking all instances for potential icon swaps...`);
            for (const inst of allInstances) {
              console.log(`ðŸ” Instance details: ${inst.name} (${inst.id})`);
              
              // If this looks like it might be an icon (has mainComponent with 'icon' in name)
              try {
                const mainComp = await inst.getMainComponentAsync();
                console.log(`ðŸ” Instance ${inst.name} has mainComponent: ${mainComp?.name || 'none'}`);
                if (mainComp && mainComp.name.toLowerCase().includes('icon')) {
                  targetInstance = inst;
                  console.log(`ðŸ” Found potential icon by mainComponent: ${inst.name} â†’ ${mainComp.name}`);
                  break;
                }
              } catch (error) {
                console.warn(`ðŸ” Error checking mainComponent for ${inst.name}:`, error);
              }
            }
          }
        } catch (error) {
          console.warn(`ðŸ” Fallback search failed:`, error);
        }
      }
      
      // Strategy 2: Search by exact ID
      if (!targetInstance) {
        console.log(`ðŸ” Searching by exact ID: ${nodeId}`);
        let node = instance.findChild(node => node.id === nodeId);
        
        if (node && node.type === 'INSTANCE') {
          targetInstance = node as InstanceNode;
        } else if (node) {
          // If found node is not an instance, search within it for component instances
          console.log(`ðŸ” Found node ${nodeId} (type: ${node.type}), searching for component instances within...`);
          try {
            const instances = (node as any).findAll?.((n: any) => n.type === 'INSTANCE') || [];
            if (instances.length > 0) {
              targetInstance = instances[0] as InstanceNode;
              console.log(`ðŸ” Found nested instance: ${targetInstance.name} (${targetInstance.id})`);
            }
          } catch (error) {
            console.warn(`ðŸ” Error searching within node:`, error);
          }
        }
      }
      
      // Strategy 3: Broader recursive search
      if (!targetInstance) {
        console.log(`ðŸ” Broader search for any matching instances...`);
        try {
          const allInstances = instance.findAll(node => node.type === 'INSTANCE') as InstanceNode[];
          
          for (const inst of allInstances) {
            if (inst.id.includes(nodeId) || inst.id === nodeId) {
              targetInstance = inst;
              console.log(`ðŸ” Found instance by ID match: ${inst.name} (${inst.id})`);
              break;
            }
            
            // Also search within this instance for the target node
            try {
              const childNode = inst.findChild(n => n.id === nodeId);
              if (childNode && childNode.type === 'INSTANCE') {
                targetInstance = childNode as InstanceNode;
                console.log(`ðŸ” Found nested instance within ${inst.name}: ${childNode.name}`);
                break;
              }
            } catch (nestedError) {
              // Continue searching
            }
          }
        } catch (error) {
          console.warn(`ðŸ” Recursive search failed:`, error);
        }
      }
      
      // Attempt the swap
      if (targetInstance) {
        try {
          const iconId = this.resolveIcon(iconName, designSystemData);
          if (iconId) {
            const iconNode = await figma.getNodeByIdAsync(iconId);
            let iconComponent: ComponentNode | null = null;
            
            if (iconNode?.type === 'COMPONENT') {
              iconComponent = iconNode as ComponentNode;
            } else if (iconNode?.type === 'COMPONENT_SET') {
              const componentSet = iconNode as ComponentSetNode;
              iconComponent = componentSet.defaultVariant ||
                            (componentSet.children.find(child => child.type === 'COMPONENT') as ComponentNode);
            }
            
            if (iconComponent && iconComponent.type === 'COMPONENT') {
              console.log(`ðŸ”„ Attempting to swap component: ${targetInstance.name} â†’ ${iconComponent.name}`);
              targetInstance.swapComponent(iconComponent);
              console.log(`âœ… Successfully swapped ${nodeId} to ${iconName} (${iconId})`);
            } else {
              console.error(`âŒ Could not get valid component for ${iconName}: ${iconId}`);
            }
          } else {
            console.warn(`âŒ Could not resolve icon "${iconName}"`);
          }
        } catch (error) {
          console.error(`âŒ Icon swap failed for ${nodeId} â†’ ${iconName}:`, error);
        }
      } else {
        console.warn(`âš ï¸ No suitable component instance found for ${nodeId}`);
        
        // EMERGENCY FALLBACK: Try to swap ANY icon instance found
        console.log(`ðŸš¨ FALLBACK: Attempting to swap any icon instance to "${iconName}"`);
        try {
          const allInstances = instance.findAll(node => node.type === 'INSTANCE') as InstanceNode[];
          console.log(`ðŸ› Available instances:`, allInstances.map(i => `${i.name} (${i.id})`));
          
          if (allInstances.length > 0) {
            // Just try the first instance
            const firstInstance = allInstances[0];
            console.log(`ðŸš¨ Trying to swap first available instance: ${firstInstance.name}`);
            
            const iconId = this.resolveIcon(iconName, designSystemData);
            console.log(`ðŸš¨ FALLBACK: Icon ID resolved to: ${iconId}`);
            if (iconId) {
              console.log(`ðŸš¨ FALLBACK: Getting component node for ID: ${iconId}`);
              const iconNode = await figma.getNodeByIdAsync(iconId);
              console.log(`ðŸš¨ FALLBACK: Got node:`, iconNode?.name, iconNode?.type);
              
              let iconComponent: ComponentNode | null = null;
              
              if (iconNode?.type === 'COMPONENT') {
                iconComponent = iconNode as ComponentNode;
                console.log(`ðŸš¨ FALLBACK: Using COMPONENT directly`);
              } else if (iconNode?.type === 'COMPONENT_SET') {
                console.log(`ðŸš¨ FALLBACK: Got COMPONENT_SET, finding default component...`);
                const componentSet = iconNode as ComponentSetNode;
                // Get the first (default) component from the set
                const defaultComponent = componentSet.defaultVariant;
                if (defaultComponent) {
                  iconComponent = defaultComponent;
                  console.log(`ðŸš¨ FALLBACK: Using default variant: ${defaultComponent.name}`);
                } else {
                  console.log(`ðŸš¨ FALLBACK: No default variant, trying first child...`);
                  const firstChild = componentSet.children.find(child => child.type === 'COMPONENT');
                  if (firstChild) {
                    iconComponent = firstChild as ComponentNode;
                    console.log(`ðŸš¨ FALLBACK: Using first child component: ${firstChild.name}`);
                  }
                }
              }
              
              if (iconComponent && iconComponent.type === 'COMPONENT') {
                console.log(`ðŸš¨ FALLBACK: Attempting to swap ${firstInstance.name} â†’ ${iconComponent.name}`);
                try {
                  firstInstance.swapComponent(iconComponent);
                  console.log(`âœ… FALLBACK SUCCESS: Swapped ${firstInstance.name} to ${iconName}`);
                } catch (swapError) {
                  console.error(`âŒ FALLBACK: Swap failed:`, swapError);
                }
              } else {
                console.error(`âŒ FALLBACK: Could not get valid COMPONENT from ${iconNode?.type}`);
              }
            } else {
              console.error(`âŒ FALLBACK: No icon ID resolved for "${iconName}"`);
            }
          }
        } catch (error) {
          console.warn(`ðŸš¨ Fallback swap failed:`, error);
        }
      }
    }
  }

  /**
   * Apply text properties with proper font loading and array support
   */
  static async applyTextPropertiesSystematic(instance: InstanceNode, textProperties: any, componentId: string): Promise<void> {
    console.log(" Applying text properties systematically:", textProperties);
    
    const schema = ComponentPropertyEngine.getComponentSchema(componentId);
    if (!schema) {
      console.warn(`âš ï¸ No schema found for component ${componentId}, using fallback text application`);
      // Fallback to original method
      await this.applyTextProperties(instance, textProperties);
      return;
    }

    // Use fast modern API for finding text nodes with error handling
    let allTextNodes: TextNode[] = [];
    try {
      allTextNodes = await PerformanceTracker.track('find-text-nodes', async () =>
        instance.findAllWithCriteria({ types: ['TEXT'] }) as TextNode[]
      );
    } catch (findError) {
      console.error(`âŒ Error finding text nodes in component ${componentId}:`, findError.message);
      // Fallback to original method if available
      try {
        await this.applyTextProperties(instance, textProperties);
      } catch (fallbackError) {
        console.error(`âŒ Fallback text application also failed:`, fallbackError.message);
      }
      return;
    }

    for (const [propKey, propValue] of Object.entries(textProperties)) {
      const textLayerInfo = schema.textLayers[propKey];
      
      if (!textLayerInfo) {
        console.warn(`âš ï¸ No text layer info found for property "${propKey}"`);
        // Try semantic matching as fallback
        const semanticMatch = Object.entries(schema.textLayers).find(([layerName, info]) => {
          const layerLower = layerName.toLowerCase();
          const propLower = propKey.toLowerCase();
          return layerLower.includes(propLower) || propLower.includes(layerLower);
        });
        
        if (semanticMatch) {
          const [matchedName, matchedInfo] = semanticMatch;
          console.log(` Using semantic match: "${propKey}" â†’ "${matchedName}"`);
          if (matchedInfo.dataType === 'array' && Array.isArray(propValue)) {
            await this.applyArrayTextProperty(propKey, propValue, allTextNodes, matchedInfo);
          } else {
            const valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
            await this.applySingleTextProperty(propKey, valueToUse, allTextNodes, matchedInfo);
          }
        }
        continue;
      }

      if (textLayerInfo.dataType === 'array' && Array.isArray(propValue)) {
        await this.applyArrayTextProperty(propKey, propValue, allTextNodes, textLayerInfo);
      } else {
        const valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
        await this.applySingleTextProperty(propKey, valueToUse, allTextNodes, textLayerInfo);
      }
    }
  }

  /**
   * Apply array text property (for tabs, chips, etc.)
   */
  static async applyArrayTextProperty(propKey: string, propValues: string[], allTextNodes: TextNode[], textLayerInfo: any): Promise<void> {
    console.log(` Applying array text property ${propKey}:`, propValues);
    
    // Find all nodes that match this text layer
    const matchingNodes = allTextNodes.filter(node => {
      const nodeLower = node.name.toLowerCase();
      const layerLower = textLayerInfo.nodeName.toLowerCase();
      const propLower = propKey.toLowerCase();
      
      return nodeLower === layerLower ||
             nodeLower.includes(propLower) ||
             nodeLower === propLower;
    });

    const maxItems = Math.min(propValues.length, textLayerInfo.maxItems || propValues.length);
    
    // Apply values to matching nodes
    for (let i = 0; i < maxItems && i < matchingNodes.length; i++) {
      const textNode = matchingNodes[i];
      const value = propValues[i];
      
      if (value && typeof value === 'string' && value.trim()) {
        await this.setTextNodeValueSafe(textNode, value, `${propKey}[${i}]`);
      }
    }
    
    // Hide extra nodes if we have fewer values than nodes
    for (let i = maxItems; i < matchingNodes.length; i++) {
      matchingNodes[i].visible = false;
      console.log(`ï¸ Hidden extra text node: "${matchingNodes[i].name}"`);
    }
    
    console.log(`âœ… Applied ${maxItems} values to ${propKey} array property`);
  }

  /**
   * Apply single text property
   */
  static async applySingleTextProperty(propKey: string, propValue: string, allTextNodes: TextNode[], textLayerInfo: any): Promise<void> {
    if (!propValue || typeof propValue !== 'string' || !propValue.trim()) return;
    
    // Try exact ID match first
    let textNode = allTextNodes.find(n => n.id === textLayerInfo.nodeId);
    
    if (!textNode) {
      // Try exact name match
      textNode = allTextNodes.find(n =>
        n.name.toLowerCase() === textLayerInfo.nodeName.toLowerCase()
      );
    }
    
    if (!textNode) {
      // Try fuzzy name match
      textNode = allTextNodes.find(n => {
        const nodeLower = n.name.toLowerCase();
        const layerLower = textLayerInfo.nodeName.toLowerCase();
        return nodeLower.includes(layerLower) || layerLower.includes(nodeLower);
      });
    }

    if (textNode) {
      await this.setTextNodeValueSafe(textNode, propValue, propKey);
    } else {
      console.warn(`âŒ No text node found for property "${propKey}" (looking for "${textLayerInfo.nodeName}")`);
    }
  }

  /**
   * Apply media properties systematically
   */
  static async applyMediaPropertiesSystematic(instance: InstanceNode, mediaProperties: any, componentId: string): Promise<void> {
    console.log("ï¸ Applying media properties systematically:", mediaProperties);
    
    const schema = ComponentPropertyEngine.getComponentSchema(componentId);
    if (!schema) {
      console.warn(`âš ï¸ No schema found for component ${componentId}, skipping media application`);
      return;
    }

    // Get all potential media nodes with error handling
    let allMediaNodes: any[] = [];
    try {
      allMediaNodes = await PerformanceTracker.track('find-media-nodes', async () => {
        const vectors = instance.findAllWithCriteria({ types: ['VECTOR'] });
        const rectangles = instance.findAllWithCriteria({ types: ['RECTANGLE'] });
        const ellipses = instance.findAllWithCriteria({ types: ['ELLIPSE'] });
        const components = instance.findAllWithCriteria({ types: ['INSTANCE', 'COMPONENT'] });
        
        return [...vectors, ...rectangles, ...ellipses, ...components];
      });
    } catch (findError) {
      console.error(`âŒ Error finding media nodes in component ${componentId}:`, findError.message);
      return; // Skip media property application if we can't find nodes
    }

    for (const [propKey, propValue] of Object.entries(mediaProperties)) {
      const mediaLayerInfo = schema.mediaLayers[propKey];
      
      if (!mediaLayerInfo) {
        console.warn(`âš ï¸ No media layer info found for property "${propKey}"`);
        continue;
      }
      
      // Find matching node
      const mediaNode = allMediaNodes.find(n => n.id === mediaLayerInfo.nodeId) ||
                       allMediaNodes.find(n => n.name.toLowerCase() === mediaLayerInfo.nodeName.toLowerCase());
      
      if (mediaNode) {
        console.log(`âœ… Found media node for "${propKey}": "${mediaNode.name}" (${mediaNode.type})`);
        // Future: Apply actual media content here (swap instances, change fills, etc.)
      } else {
        console.warn(`âŒ No media node found for property "${propKey}"`);
      }
    }
  }

  /**
   * Safe text setting with proper font loading
   */
  static async setTextNodeValueSafe(textNode: TextNode, value: string, context: string): Promise<void> {
    try {
      await PerformanceTracker.track('set-text-value', async () => {
        // Critical: Check for missing fonts first
        if (textNode.hasMissingFont) {
          console.error(`âŒ Cannot set text "${context}": Missing fonts`);
          return;
        }

        if (!textNode.visible) {
          textNode.visible = true;
        }
        
        // Load all required fonts properly
        await this.loadAllRequiredFonts(textNode);
        textNode.characters = value;
        console.log(`âœ… Set "${textNode.name}" to "${value}" (${context})`);
      });
    } catch (fontError) {
      console.error(`âŒ Font loading failed for "${textNode.name}":`, fontError);
      
      // Fallback to Inter Regular
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        textNode.fontName = { family: "Inter", style: "Regular" };
        textNode.characters = value;
        console.log(`âš ï¸ Used fallback font for "${textNode.name}"`);
      } catch (fallbackError) {
        console.error(`âŒ Even fallback failed:`, fallbackError);
      }
    }
  }

  /**
   * Load all fonts required for a text node (handles mixed fonts)
   */
  static async loadAllRequiredFonts(textNode: TextNode): Promise<void> {
    try {
      // Handle single font scenario
      if (typeof textNode.fontName !== 'symbol') {
        await figma.loadFontAsync(textNode.fontName as FontName);
        return;
      }
      
      // Handle mixed fonts scenario
      if (textNode.fontName === figma.mixed && textNode.characters.length > 0) {
        const allFonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
        const uniqueFonts = new Map<string, FontName>();
        
        allFonts.forEach(font => {
          uniqueFonts.set(`${font.family}-${font.style}`, font);
        });
        
        const fontPromises = Array.from(uniqueFonts.values()).map(font =>
          figma.loadFontAsync(font)
        );
        
        await Promise.all(fontPromises);
      }
    } catch (error) {
      throw error; // Will be handled by calling function
    }
  }

  /**
   * Enhanced dynamic generation using systematic approach
   */
  static async generateUIFromDataSystematic(layoutData: any, parentNode: FrameNode | PageNode, designSystemData?: any): Promise<FrameNode> {
    // Add breadcrumb system at the very start
    let lastBreadcrumb = 'START';
    const breadcrumb = (location: string) => {
      lastBreadcrumb = location;
      console.log(`ðŸž ${location}`);
    };
    
    try {
      breadcrumb('INIT: Method start');
      
      // Set design system data for this rendering session
      if (designSystemData) {
        breadcrumb('INIT: Setting design system data');
        this.setDesignSystemData(designSystemData);
      }
      
      console.log('ðŸ”§ Starting generateUIFromDataSystematic with data:', {
        hasLayoutContainer: !!layoutData.layoutContainer,
        hasItems: !!layoutData.items,
        parentType: parentNode.type,
        hasDesignSystemData: !!designSystemData
      });
      
      console.log('ðŸš¨ DEBUG TRACE: About to start main processing');
      
      // Skip ComponentPropertyEngine if no schemas available
      const schemas = ComponentPropertyEngine.getAllSchemas();
      if (schemas.length === 0) {
        console.log('âš ï¸ No schemas - running systematic generation in basic mode');
      }
    
    let currentFrame: FrameNode;
    const containerData = layoutData.layoutContainer || layoutData;
    
    console.log('ðŸš¨ DEBUG TRACE: Container data extracted:', {
      hasContainerData: !!containerData,
      containerDataKeys: containerData ? Object.keys(containerData) : [],
      hasWidth: !!(containerData && containerData.width),
      parentNodeType: parentNode.type
    });
    
    // DEBUG LOG 1: Input data verification + Full debug output
    const debugData = {
      timestamp: new Date().toISOString(),
      inputData: layoutData,
      containerData: containerData,
      parentNodeType: parentNode.type
    };
    
    console.log('ðŸ“ FULL INPUT DATA FOR DEBUGGING:', JSON.stringify(debugData, null, 2));
    
    // Create downloadable debug file
    try {
      const debugContent = JSON.stringify(debugData, null, 2);
      const blob = new Blob([debugContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Auto-download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = 'debug-renderer-input.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('ðŸ’¾ Debug file auto-downloaded as: debug-renderer-input.json');
    } catch (e) {
      console.warn('âš ï¸ Could not auto-download debug file:', e.message);
      console.log('ðŸ“‹ Copy this JSON manually:', JSON.stringify(debugData, null, 2));
    }
    
    console.log('ðŸ” INPUT DATA:', {
      containerData: containerData,
      hasWidth: !!containerData?.width,
      widthValue: containerData?.width
    });
    
    if (parentNode.type === 'PAGE' && containerData) {
      breadcrumb('FRAME: Creating root frame for PAGE');
      console.log('ðŸš¨ DEBUG TRACE: Creating root frame for PAGE');
      currentFrame = figma.createFrame();
      console.log('ðŸš¨ DEBUG TRACE: Root frame created successfully');
      
      // Set initial size - width fixed, height to minimum
      const initialWidth = containerData.width || 375;
      const minHeight = containerData.minHeight || 812;
      
      breadcrumb('FRAME: Setting initial size with resize');
      console.log('ðŸš¨ DEBUG TRACE: About to call resize with:', { initialWidth, minHeight });
      currentFrame.resize(initialWidth, minHeight);
      console.log('ðŸš¨ DEBUG TRACE: Resize completed successfully');
      
      // Configure auto-layout FIRST, then sizing properties
      if (containerData.layoutMode && containerData.layoutMode !== 'NONE') {
        // Step 1: Enable auto-layout
        try {
          breadcrumb('FRAME: Setting layoutMode to ' + containerData.layoutMode);
          currentFrame.layoutMode = containerData.layoutMode;
          console.log('âœ… Set layoutMode to:', containerData.layoutMode);
        } catch (layoutModeError) {
          console.warn('âš ï¸ Could not set layoutMode:', layoutModeError.message);
          return currentFrame; // Exit early if auto-layout can't be enabled
        }
        
        // Step 2: Set sizing modes AFTER auto-layout is enabled
        try {
          // Key change: Use AUTO for primary axis (vertical) to hug content
          breadcrumb('FRAME: Setting primaryAxisSizingMode to AUTO');
          currentFrame.primaryAxisSizingMode = "AUTO"; // Force content hugging regardless of JSON
          console.log('âœ… Set primaryAxisSizingMode to AUTO');
        } catch (sizingError) {
          console.warn('âš ï¸ Could not set primaryAxisSizingMode:', sizingError.message);
        }
        
        try {
          currentFrame.counterAxisSizingMode = "FIXED"; // Keep width fixed
          console.log('âœ… Set counterAxisSizingMode to FIXED');
        } catch (counterError) {
          console.warn('âš ï¸ Could not set counterAxisSizingMode:', counterError.message);
        }
        
        // Step 3: Set minimum height constraint AFTER sizing modes
        try {
          if (minHeight) {
            currentFrame.minHeight = minHeight;
            console.log('âœ… Set minHeight to:', minHeight);
          }
        } catch (minHeightError) {
          console.warn('âš ï¸ Could not set minHeight:', minHeightError.message);
        }
      }
      
      // Auto-position to prevent overlapping
      const position = await this.getNextRenderPosition(initialWidth, minHeight);
      currentFrame.x = position.x;
      currentFrame.y = position.y;
      
      parentNode.appendChild(currentFrame);
    } else if (parentNode.type === 'FRAME') {
      console.log('ðŸš¨ DEBUG TRACE: Using existing FRAME as container');
      currentFrame = parentNode;
      console.log('ðŸš¨ DEBUG TRACE: Current frame properties:', {
        type: currentFrame.type,
        layoutMode: currentFrame.layoutMode,
        hasWidthProperty: 'width' in currentFrame,
        widthDescriptor: Object.getOwnPropertyDescriptor(currentFrame, 'width')
      });
    } else {
      figma.notify("Cannot add items without a parent frame.", { error: true });
      return figma.createFrame();
    }
    
    // Apply container properties
    // DEBUG LOG 2: Container condition check
    console.log('ðŸ” CONTAINER CONDITION:', {
      hasContainerData: !!containerData,
      containerEqualsLayout: containerData === layoutData,
      conditionPassed: !!(containerData && containerData !== layoutData)
    });
    if (containerData) {
      breadcrumb('FRAME: Setting name to ' + (containerData.name || "Generated Frame"));
      currentFrame.name = containerData.name || "Generated Frame";
      
      console.log('ðŸ”§ Applying container properties:', {
        name: containerData.name,
        layoutMode: containerData.layoutMode,
        itemSpacing: containerData.itemSpacing,
        primaryAxisSizingMode: containerData.primaryAxisSizingMode,
        width: containerData.width,
        hasWidth: !!containerData.width
      });
      
      try {
        breadcrumb('FRAME: Setting secondary layoutMode to ' + (containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL" ? containerData.layoutMode : "NONE"));
        currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
          ? containerData.layoutMode : "NONE";
        console.log('ðŸ”§ Frame layoutMode set to:', currentFrame.layoutMode);
      } catch (e) {
        console.warn('âš ï¸ Failed to set layoutMode:', e.message);
      }
        
      if (currentFrame.layoutMode !== 'NONE') {
        try {
          breadcrumb('FRAME: Setting paddingTop to ' + (typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0));
          currentFrame.paddingTop = typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0;
        } catch (e) {
          console.warn('âš ï¸ Failed to set paddingTop:', e.message);
        }
        
        try {
          breadcrumb('FRAME: Setting paddingBottom to ' + (typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0));
          currentFrame.paddingBottom = typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0;
        } catch (e) {
          console.warn('âš ï¸ Failed to set paddingBottom:', e.message);
        }
        
        try {
          breadcrumb('FRAME: Setting paddingLeft to ' + (typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0));
          currentFrame.paddingLeft = typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0;
        } catch (e) {
          console.warn('âš ï¸ Failed to set paddingLeft:', e.message);
        }
        
        try {
          breadcrumb('FRAME: Setting paddingRight to ' + (typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0));
          currentFrame.paddingRight = typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0;
        } catch (e) {
          console.warn('âš ï¸ Failed to set paddingRight:', e.message);
        }
        
        // Enhanced auto-layout properties
        try {
          if (containerData.itemSpacing === 'AUTO') {
            (currentFrame as any).itemSpacing = 'AUTO';
          } else {
            currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set itemSpacing:', e.message);
        }
        
        // Layout wrap support
        try {
          if (containerData.layoutWrap !== undefined) {
            currentFrame.layoutWrap = containerData.layoutWrap;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set layoutWrap:', e.message);
        }
        
        // Primary axis alignment
        try {
          if (containerData.primaryAxisAlignItems) {
            currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set primaryAxisAlignItems:', e.message);
        }
        
        // Counter axis alignment
        try {
          if (containerData.counterAxisAlignItems) {
            currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set counterAxisAlignItems:', e.message);
        }
        
        // Sizing modes - Skip primaryAxisSizingMode here if we have explicit width
        // (it will be set to FIXED later in the width setting block)
        console.log('ðŸ” EARLY CHECK:', {
          hasWidth: !!containerData.width,
          widthValue: containerData.width,
          skipEarlySetting: !containerData.width
        });
        
        if (!containerData.width || containerData.width === 0) {
          try {
            if (containerData.primaryAxisSizingMode) {
              const hasPrimarySetter = Object.getOwnPropertyDescriptor(currentFrame, 'primaryAxisSizingMode')?.set !== undefined;
              if (hasPrimarySetter) {
                breadcrumb('FRAME: Setting early primaryAxisSizingMode to ' + containerData.primaryAxisSizingMode);
                currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
                console.log('ðŸ” Set primaryAxisSizingMode early:', containerData.primaryAxisSizingMode);
              } else {
                console.warn('âš ï¸ Skipping early primaryAxisSizingMode - setter not available');
              }
            }
          } catch (e) {
            console.warn('âš ï¸ Failed to set primaryAxisSizingMode:', e.message);
          }
        } else {
          console.log('ðŸ” SKIPPED early primaryAxisSizingMode setting (has width)');
        }
        
        try {
          if (containerData.counterAxisSizingMode) {
            const hasCounterSetter = Object.getOwnPropertyDescriptor(currentFrame, 'counterAxisSizingMode')?.set !== undefined;
            if (hasCounterSetter) {
              breadcrumb('FRAME: Setting counterAxisSizingMode to ' + containerData.counterAxisSizingMode);
              currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
            } else {
              console.warn('âš ï¸ Skipping counterAxisSizingMode - setter not available');
            }
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set counterAxisSizingMode:', e.message);
        }
      }
      
      // Size constraints - wrapped in try-catch to prevent property setter errors
      try {
        if (containerData.minWidth !== undefined) {
          currentFrame.minWidth = containerData.minWidth;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set minWidth:', e.message);
      }
      
      try {
        if (containerData.maxWidth !== undefined) {
          currentFrame.maxWidth = containerData.maxWidth;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set maxWidth:', e.message);
      }
      
      try {
        if (containerData.minHeight !== undefined) {
          currentFrame.minHeight = containerData.minHeight;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set minHeight:', e.message);
      }
      
      try {
        if (containerData.maxHeight !== undefined) {
          currentFrame.maxHeight = containerData.maxHeight;
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to set maxHeight:', e.message);
      }
      
      if (containerData.width) {
        console.log('ðŸš¨ WIDTH SETTING ENTRY POINT:', {
          layoutMode: currentFrame.layoutMode,
          widthDescriptor: Object.getOwnPropertyDescriptor(currentFrame, 'width'),
          hasWidthSetter: Object.getOwnPropertyDescriptor(currentFrame, 'width')?.set !== undefined
        });
        try {
          // ENHANCED DEBUG: Comprehensive frame state logging
          const frameState = {
            width: containerData.width,
            currentWidth: currentFrame.width,
            layoutMode: currentFrame.layoutMode,
            primaryAxisSizing: currentFrame.primaryAxisSizingMode,
            counterAxisSizing: currentFrame.counterAxisSizingMode,
            frameType: currentFrame.type,
            parent: currentFrame.parent?.type,
            hasLayoutMode: 'layoutMode' in currentFrame,
            isAutoLayout: currentFrame.layoutMode !== 'NONE'
          };

          console.log('COMPREHENSIVE WIDTH SET ATTEMPT:', frameState);
          console.log('FRAME PROPERTIES AVAILABLE:', Object.getOwnPropertyNames(currentFrame));
          console.log('ATTEMPTING WIDTH SET ON:', {
            nodeId: currentFrame.id,
            nodeName: currentFrame.name,
            canSetWidth: 'width' in currentFrame
          });

          if (currentFrame.layoutMode !== 'NONE') {
            console.log('ðŸ”§ ATTEMPTING AUTO-LAYOUT WIDTH SET');
            
            // WORKAROUND: Create new auto-layout frame if width setter not available
            const hasWidthSetter = Object.getOwnPropertyDescriptor(currentFrame, 'width')?.set !== undefined;
            
            if (!hasWidthSetter) {
              console.log('âš ï¸ WIDTH SETTER NOT AVAILABLE - Using resize workaround for auto-layout frame');
              
              // Use resize as fallback, then set sizing modes
              breadcrumb('FRAME: Using resize workaround for width ' + containerData.width);
              currentFrame.resize(containerData.width, currentFrame.height);
              
              try {
                // Check if sizing mode setters are available
                const hasPrimarySetter = Object.getOwnPropertyDescriptor(currentFrame, 'primaryAxisSizingMode')?.set !== undefined;
                const hasCounterSetter = Object.getOwnPropertyDescriptor(currentFrame, 'counterAxisSizingMode')?.set !== undefined;
                
                console.log('ðŸ”§ SIZING MODE SETTERS CHECK:', {
                  hasPrimarySetter,
                  hasCounterSetter,
                  layoutMode: currentFrame.layoutMode
                });
                
                if (hasPrimarySetter) {
                  breadcrumb('FRAME: Setting primaryAxisSizingMode to FIXED (resize workaround)');
                  currentFrame.primaryAxisSizingMode = "FIXED";
                } else {
                  console.warn('âš ï¸ primaryAxisSizingMode setter not available');
                }
                
                if (hasCounterSetter) {
                  breadcrumb('FRAME: Setting counterAxisSizingMode to ' + (containerData.counterAxisSizingMode || "FIXED") + ' (resize workaround)');
                  currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode || "FIXED";
                } else {
                  console.warn('âš ï¸ counterAxisSizingMode setter not available');
                }
              } catch (e) {
                console.warn('âš ï¸ Could not set sizing modes:', e.message);
              }
              
              console.log('âœ… Applied width via resize workaround:', containerData.width);
            } else {
              // Standard width setting for proper auto-layout frames
              breadcrumb('FRAME: Setting width directly to ' + containerData.width);
              currentFrame.width = containerData.width;
              console.log('âœ… Set width directly:', containerData.width);
            }
          } else {
            // For regular frames, use resize
            console.log('REGULAR FRAME RESIZE:', {
              currentHeight: currentFrame.height,
              targetWidth: containerData.width
            });
            breadcrumb('FRAME: Regular frame resize to width ' + containerData.width);
            currentFrame.resize(containerData.width, currentFrame.height);
            console.log('Regular frame resized successfully');
          }
        } catch (e) {
          console.error('DETAILED WIDTH SET ERROR:', {
            message: e.message,
            stack: e.stack,
            containerWidth: containerData.width,
            frameState: {
              type: currentFrame.type,
              layoutMode: currentFrame.layoutMode,
              primaryAxis: currentFrame.primaryAxisSizingMode,
              counterAxis: currentFrame.counterAxisSizingMode
            }
          });
        }
      } else {
        try {
          if (!containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = "AUTO";
          }
        } catch (e) {
          console.warn('âš ï¸ Failed to set counterAxisSizingMode (AUTO):', e.message);
        }
      }
    }
    
    const items = layoutData.items || containerData.items;
    if (!items || !Array.isArray(items)) return currentFrame;
    
    for (const item of items) {
      try {
        console.log('ðŸ”¥ PROCESSING ITEM:', item.type, item.name || 'unnamed', 'layoutMode:', item.layoutMode);
        
        // Pre-process item to fix common issues
        const processedItem = {...item};
        
        // Validate and potentially transform native types
        if (processedItem.type?.startsWith('native-')) {
          const validatedType = this.validateNativeType(processedItem.type);
          
          if (!validatedType) {
            console.error(`âŒ Skipping invalid native element type: ${processedItem.type}`);
            continue;
          }
          
          // If it transformed to layoutContainer, handle accordingly
          if (validatedType === 'layoutContainer') {
            processedItem.type = 'layoutContainer';
            processedItem.layoutMode = processedItem.layoutMode || 'VERTICAL';
            processedItem.itemSpacing = processedItem.itemSpacing || 8;
            // Move items if they were in properties
            if (processedItem.properties?.items) {
              processedItem.items = processedItem.properties.items;
              delete processedItem.properties.items;
            }
          } else {
            processedItem.type = validatedType;
          }
        }
        
        // Normalize component ID property
        if (processedItem.type === 'component') {
          processedItem.componentNodeId = processedItem.componentNodeId ||
                                         processedItem.componentId ||
                                         processedItem.id;
          delete processedItem.componentId;
          delete processedItem.id;
        }
        
        // Sanitize width properties
        if (processedItem.properties?.width) {
          const sanitizedWidth = this.sanitizeWidth(processedItem.properties.width);
          if (sanitizedWidth === null && processedItem.properties.width === '100%') {
            processedItem.properties.horizontalSizing = 'FILL';
            delete processedItem.properties.width;
          } else if (sanitizedWidth !== null) {
            processedItem.properties.width = sanitizedWidth;
          } else {
            delete processedItem.properties.width;
          }
        }
        
        // Handle container width
        if (processedItem.width && processedItem.layoutMode) {
          const sanitizedWidth = this.sanitizeWidth(processedItem.width);
          if (sanitizedWidth !== null) {
            processedItem.width = sanitizedWidth;
          } else {
            delete processedItem.width;
            processedItem.counterAxisSizingMode = 'AUTO';
          }
        }
        
        // Process based on type
        if (processedItem.type === 'layoutContainer') {
          console.log('ðŸ”¥ CREATING NESTED LAYOUT CONTAINER:', processedItem.name, 'layoutMode:', processedItem.layoutMode);
          console.log('ðŸš€ DEPLOYMENT CHECK AUG 12 2025 - CODE IS DEPLOYED AND RUNNING');
          breadcrumb('NESTED: Creating layoutContainer frame for ' + (processedItem.name || 'unnamed'));
          const nestedFrame = figma.createFrame();
          breadcrumb('NESTED: Appending layoutContainer frame to parent');
          currentFrame.appendChild(nestedFrame);
          
          console.log('ðŸ” DEBUG: Created nested frame with defaults:', {
            name: processedItem.name,
            layoutMode: processedItem.layoutMode,
            primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
            counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
            height: nestedFrame.height
          });
          
          // Apply child layout properties
          console.log('ðŸš¨ DEBUG LINE 3072: About to call applyChildLayoutProperties', {
            nestedFrameType: nestedFrame.type,
            itemType: processedItem.type,
            itemKeys: Object.keys(processedItem),
            itemHasProperties: 'properties' in processedItem,
            itemDirectProperties: {
              layoutAlign: processedItem.layoutAlign,
              horizontalSizing: processedItem.horizontalSizing,
              layoutGrow: processedItem.layoutGrow,
              width: processedItem.width,
              layoutMode: processedItem.layoutMode
            }
          });
          
          // CORRECT - only pass relevant child layout properties
          // CRITICAL FIX: Include sizing modes for horizontal containers
          const childLayoutProps = {
            layoutAlign: processedItem.layoutAlign,
            horizontalSizing: processedItem.horizontalSizing,
            layoutGrow: processedItem.layoutGrow,
            layoutPositioning: processedItem.layoutPositioning,
            minWidth: processedItem.minWidth,
            maxWidth: processedItem.maxWidth,
            minHeight: processedItem.minHeight,
            maxHeight: processedItem.maxHeight,
            // FIX: Pass sizing modes so horizontal containers can hug content
            primaryAxisSizingMode: processedItem.primaryAxisSizingMode,
            counterAxisSizingMode: processedItem.counterAxisSizingMode,
            layoutMode: processedItem.layoutMode
          };
          
          // Remove undefined properties to avoid unnecessary processing
          Object.keys(childLayoutProps).forEach(key => {
            if (childLayoutProps[key] === undefined) {
              delete childLayoutProps[key];
            }
          });
          
          breadcrumb('NESTED: Applying child layout properties to layoutContainer');
          this.applyChildLayoutProperties(nestedFrame, childLayoutProps);
          
          // CRITICAL FIX: Reset height for horizontal AUTO containers
          if (nestedFrame.layoutMode === 'HORIZONTAL' && nestedFrame.primaryAxisSizingMode === 'AUTO') {
            console.log('ðŸ”§ HORIZONTAL AUTO CONTAINER: Forcing height reset from default 100px');
            
            // Direct approach: Force height to hug by resetting the frame height
            try {
              // Method 1: Try to force height recalculation by changing the height property
              console.log('ðŸ“ Current height before fix:', nestedFrame.height);
              
              // For horizontal containers with AUTO primary axis, the height should adapt to content
              // Force the frame to recalculate its height based on children
              const children = nestedFrame.children;
              if (children.length > 0) {
                // Calculate the maximum height of child elements
                let maxChildHeight = 0;
                for (const child of children) {
                  if ('height' in child) {
                    maxChildHeight = Math.max(maxChildHeight, (child as any).height);
                  }
                }
                
                console.log('ðŸ“ Calculated max child height:', maxChildHeight);
                
                if (maxChildHeight > 0 && maxChildHeight !== nestedFrame.height) {
                  // Apply padding if it exists
                  const paddingTop = (nestedFrame as any).paddingTop || 0;
                  const paddingBottom = (nestedFrame as any).paddingBottom || 0;
                  const targetHeight = maxChildHeight + paddingTop + paddingBottom;
                  
                  console.log('ðŸ“ Setting frame height to:', targetHeight);
                  nestedFrame.resize(nestedFrame.width, targetHeight);
                }
              }
              
              console.log('ðŸ“ Final height after fix:', nestedFrame.height);
              console.log('âœ… Height reset complete - should now hug content');
            } catch (error) {
              console.error('âŒ Height reset failed:', error);
            }
          }
          
          console.log('ðŸ” DEBUG: After applyChildLayoutProperties:', {
            name: processedItem.name,
            layoutMode: nestedFrame.layoutMode,
            primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
            counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
            height: nestedFrame.height
          });
          
          breadcrumb('NESTED: Recursive call to generateUIFromDataSystematic for layoutContainer');
          await this.generateUIFromDataSystematic({
            layoutContainer: processedItem,
            items: processedItem.items
          }, nestedFrame);
          
          console.log('ðŸ” DEBUG: Final frame properties:', {
            name: nestedFrame.name,
            layoutMode: nestedFrame.layoutMode,
            primaryAxisSizingMode: nestedFrame.primaryAxisSizingMode,
            counterAxisSizingMode: nestedFrame.counterAxisSizingMode,
            height: nestedFrame.height
          });
          
        } else if (processedItem.type === 'frame' && processedItem.layoutContainer) {
          breadcrumb('NESTED: Creating frame with layoutContainer');
          const nestedFrame = figma.createFrame();
          breadcrumb('NESTED: Appending frame to parent');
          currentFrame.appendChild(nestedFrame);
          breadcrumb('NESTED: Recursive call for frame type');
          await this.generateUIFromDataSystematic(processedItem, nestedFrame);
          
        }
        
        // Safe defensive conversion for native elements with children
        else if (processedItem.type?.startsWith('native-') && (processedItem.items || processedItem.properties?.items)) {
          console.warn(`âš ï¸ Invalid structure: ${processedItem.type} cannot have child items`);
          console.warn('ðŸ“¦ Auto-converting to layoutContainer to prevent crash');
          
          // Extract the items array (might be in different places)
          const childItems = processedItem.items || processedItem.properties?.items || [];
          
          // Create a proper container that preserves visual intent
          const safeContainer = {
            type: 'layoutContainer',
            layoutMode: 'VERTICAL',
            itemSpacing: 0,
            padding: 0,
            items: childItems
          };
          
          // Preserve visual styling if it was a styled rectangle
          if (processedItem.type === 'native-rectangle' && processedItem.properties) {
            // Transfer visual properties safely
            if (processedItem.properties.fill?.color) {
              safeContainer.backgroundColor = processedItem.properties.fill.color;
            }
            if (processedItem.properties.cornerRadius) {
              safeContainer.cornerRadius = processedItem.properties.cornerRadius;
            }
            if (processedItem.properties.padding) {
              safeContainer.padding = processedItem.properties.padding;
            }
            // Transfer sizing if present
            if (processedItem.properties.width) {
              safeContainer.width = processedItem.properties.width;
            }
            if (processedItem.properties.height) {
              safeContainer.height = processedItem.properties.height;
            }
          }
          
          // Log what we're doing for debugging
          console.log('ðŸ”„ Converted structure:', {
            from: processedItem.type,
            to: 'layoutContainer',
            preservedStyling: {
              backgroundColor: safeContainer.backgroundColor || 'none',
              cornerRadius: safeContainer.cornerRadius || 'none'
            }
          });
          
          // Process as container instead of native element
          breadcrumb('NESTED: Creating defensive container frame for native element');
          const nestedFrame = figma.createFrame();
          breadcrumb('NESTED: Appending defensive container to parent');
          currentFrame.appendChild(nestedFrame);
          
          console.log('ðŸš¨ DEBUG LINE 3138: About to call applyChildLayoutProperties', {
            nestedFrameType: nestedFrame.type,
            itemType: safeContainer.type,
            itemKeys: Object.keys(safeContainer),
            itemHasProperties: 'properties' in safeContainer,
            itemDirectProperties: {
              layoutAlign: safeContainer.layoutAlign,
              horizontalSizing: safeContainer.horizontalSizing,
              layoutGrow: safeContainer.layoutGrow,
              width: safeContainer.width,
              layoutMode: safeContainer.layoutMode
            }
          });
          
          // CORRECT - only pass relevant child layout properties
          const childLayoutProps2 = {
            layoutAlign: safeContainer.layoutAlign,
            horizontalSizing: safeContainer.horizontalSizing,
            layoutGrow: safeContainer.layoutGrow,
            layoutPositioning: safeContainer.layoutPositioning,
            minWidth: safeContainer.minWidth,
            maxWidth: safeContainer.maxWidth,
            minHeight: safeContainer.minHeight,
            maxHeight: safeContainer.maxHeight
          };
          
          // Remove undefined properties to avoid unnecessary processing
          Object.keys(childLayoutProps2).forEach(key => {
            if (childLayoutProps2[key] === undefined) {
              delete childLayoutProps2[key];
            }
          });
          
          breadcrumb('NESTED: Applying child layout properties to defensive container');
          this.applyChildLayoutProperties(nestedFrame, childLayoutProps2);
          
          breadcrumb('NESTED: Recursive call for defensive container');
          await this.generateUIFromDataSystematic({
            layoutContainer: safeContainer,
            items: safeContainer.items
          }, nestedFrame);
          continue;
        }
        // NATIVE ELEMENTS - Handle these BEFORE component resolution
        else if (processedItem.type === 'native-text' || processedItem.type === 'text') {
          await this.createTextNode(processedItem, currentFrame);
          continue;
        }
        else if (processedItem.type === 'native-rectangle') {
          await this.createRectangleNode(processedItem, currentFrame);
          continue;
        }
        else if (processedItem.type === 'native-circle') {
          await this.createEllipseNode(processedItem, currentFrame);
          continue;
        }
        // COMPONENT ELEMENTS
        else if (processedItem.type === 'component') {
          if (!processedItem.componentNodeId) {
            console.error('âŒ No component ID found after normalization');
            continue;
          }
          
          let componentNode;
          try {
            componentNode = await figma.getNodeByIdAsync(processedItem.componentNodeId);
          } catch (nodeError) {
            console.warn(`âš ï¸ Error accessing component ${processedItem.componentNodeId}: ${nodeError.message}`);
            componentNode = null;
          }
          
          if (!componentNode) {
            console.warn(`âš ï¸ Component ${processedItem.componentNodeId} not found - creating placeholder`);
            await this.createMissingComponentPlaceholder(processedItem.componentNodeId, currentFrame);
            continue;
          }
          
          // Get component info from design system scan data if available
          let componentInfo = null;
          try {
            // Import DesignSystemScannerService at runtime to avoid circular imports
            const { DesignSystemScannerService } = await import('./design-system-scanner-service');
            const scanSession = await DesignSystemScannerService.getScanSession();
            if (scanSession?.components) {
              componentInfo = scanSession.components.find(c => c.id === processedItem.componentNodeId);
            }
          } catch (error) {
            console.warn('âš ï¸ Could not load component info from scan data:', error);
          }
          
          // Normalize properties
          if (processedItem.properties && componentInfo?.textLayers) {
            processedItem.properties = this.normalizePropertyNames(
              processedItem.properties,
              componentInfo.textLayers
            );
          }
          
          // Validate and fix variants
          if (processedItem.variants && componentInfo?.variantDetails) {
            processedItem.variants = this.validateAndFixVariants(
              processedItem.variants,
              componentInfo.variantDetails
            );
          }
          
          // Use systematic approach for components with processed data
          await this.createComponentInstanceSystematic(processedItem, currentFrame);
          
          // ADD THIS: Apply child layout properties for components at top level
          const componentInstance = currentFrame.children[currentFrame.children.length - 1];
          if (componentInstance) {
            // Extract child layout properties from the item
            const childLayoutProps = {
              layoutAlign: processedItem.layoutAlign || processedItem.properties?.layoutAlign,
              horizontalSizing: processedItem.horizontalSizing || processedItem.properties?.horizontalSizing,
              layoutGrow: processedItem.layoutGrow || processedItem.properties?.layoutGrow,
              layoutPositioning: processedItem.layoutPositioning || processedItem.properties?.layoutPositioning,
              minWidth: processedItem.minWidth || processedItem.properties?.minWidth,
              maxWidth: processedItem.maxWidth || processedItem.properties?.maxWidth,
              minHeight: processedItem.minHeight || processedItem.properties?.minHeight,
              maxHeight: processedItem.maxHeight || processedItem.properties?.maxHeight
            };
            
            // Remove undefined properties
            Object.keys(childLayoutProps).forEach(key => {
              if (childLayoutProps[key] === undefined) {
                delete childLayoutProps[key];
              }
            });
            
            // Apply child layout properties if any exist
            if (Object.keys(childLayoutProps).length > 0) {
              console.log('âœ… Applying child layout properties to component:', childLayoutProps);
              this.applyChildLayoutProperties(componentInstance, childLayoutProps);
            }
          }
        }
        else {
          // Use systematic approach for other types
          await this.createComponentInstanceSystematic(processedItem, currentFrame);
          
          // ADD THIS: Apply child layout properties for other types at top level
          const createdInstance = currentFrame.children[currentFrame.children.length - 1];
          if (createdInstance) {
            // Extract child layout properties from the item
            const childLayoutProps = {
              layoutAlign: processedItem.layoutAlign || processedItem.properties?.layoutAlign,
              horizontalSizing: processedItem.horizontalSizing || processedItem.properties?.horizontalSizing,
              layoutGrow: processedItem.layoutGrow || processedItem.properties?.layoutGrow,
              layoutPositioning: processedItem.layoutPositioning || processedItem.properties?.layoutPositioning,
              minWidth: processedItem.minWidth || processedItem.properties?.minWidth,
              maxWidth: processedItem.maxWidth || processedItem.properties?.maxWidth,
              minHeight: processedItem.minHeight || processedItem.properties?.minHeight,
              maxHeight: processedItem.maxHeight || processedItem.properties?.maxHeight
            };
            
            // Remove undefined properties
            Object.keys(childLayoutProps).forEach(key => {
              if (childLayoutProps[key] === undefined) {
                delete childLayoutProps[key];
              }
            });
            
            // Apply child layout properties if any exist
            if (Object.keys(childLayoutProps).length > 0) {
              console.log('âœ… Applying child layout properties to other type:', childLayoutProps);
              this.applyChildLayoutProperties(createdInstance, childLayoutProps);
            }
          }
        }
        
      } catch (itemError) {
        console.error(`âŒ Error rendering item:`, itemError);
        console.log('Problematic item:', JSON.stringify(item, null, 2));
        
        // Create error placeholder
        try {
          breadcrumb('ERROR: Creating error placeholder frame');
          const errorFrame = figma.createFrame();
          try {
            errorFrame.name = `Error: ${itemError.message}`;
          } catch (e) {
            console.warn('Could not set name on error frame:', e.message);
          }
          try {
            errorFrame.fills = [{type: 'SOLID', color: {r: 1, g: 0.8, b: 0.8}}];
          } catch (e) {
            console.warn('Could not set fills on error frame:', e.message);
          }
          try {
            errorFrame.resize(200, 50);
          } catch (e) {
            console.warn('Could not resize error frame:', e.message);
          }
          currentFrame.appendChild(errorFrame);
        } catch (e) {
          console.error('Could not create error placeholder:', e);
        }
        
        // Continue with next item instead of failing entire render
        continue;
      }
    }
    
    // Post-processing: Ensure frame maintains intended dimensions after content is added
    const postProcessContainerData = layoutData.layoutContainer || layoutData;
    if (postProcessContainerData && postProcessContainerData.width && currentFrame.layoutMode !== 'NONE') {
      console.log('ðŸ”§ Post-processing: Re-enforcing frame width to:', postProcessContainerData.width);
      breadcrumb('POSTPROCESS: Re-enforcing frame width to ' + postProcessContainerData.width);
      
      // Check if width setter is available
      const hasWidthSetter = Object.getOwnPropertyDescriptor(currentFrame, 'width')?.set !== undefined;
      
      if (hasWidthSetter) {
        currentFrame.width = postProcessContainerData.width;
        console.log('âœ… Re-enforced width via setter');
      } else {
        // Use resize as fallback
        try {
          currentFrame.resize(postProcessContainerData.width, currentFrame.height);
          console.log('âœ… Re-enforced width via resize fallback');
        } catch (resizeError) {
          console.warn('âš ï¸ Could not re-enforce width:', resizeError.message);
          // Continue without re-enforcing - not critical
        }
      }
    }

    // Add this BEFORE the final return statement
    // After all content is rendered, adjust height if this is a root frame
    if (parentNode.type === 'PAGE' && currentFrame.layoutMode !== 'NONE') {
      const minHeight = containerData.minHeight || 812;
      await this.adjustRootFrameHeight(currentFrame, minHeight);
      
      console.log('ðŸŽ¯ Final root frame dimensions:', {
        width: currentFrame.width,
        height: currentFrame.height,
        primaryAxisSizing: currentFrame.primaryAxisSizingMode,
        minHeight: currentFrame.minHeight
      });
    }

    if (parentNode.type === 'PAGE') {
      figma.currentPage.selection = [currentFrame];
      figma.viewport.scrollAndZoomIntoView([currentFrame]);
      
      // Show performance report
      const perfReport = ComponentPropertyEngine.getPerformanceReport();
      console.log("âš¡ Performance Report:", perfReport);
      
      figma.notify(`UI generated with systematic validation!`, { timeout: 2500 });
    }
    
    return currentFrame;
    
    } catch (error) {
      console.error('âŒ BREADCRUMB LOCATION:', lastBreadcrumb);
      console.error('âŒ generateUIFromDataSystematic error:', error);
      console.error('âŒ Error details:', {
        lastBreadcrumb: lastBreadcrumb,
        message: error.message,
        stack: error.stack,
        name: error.name,
        layoutData: layoutData,
        parentNodeType: parentNode.type
      });
      
      // Create a basic frame as fallback
      breadcrumb('FALLBACK: Creating fallback frame');
      const fallbackFrame = figma.createFrame();
      try {
        fallbackFrame.name = "Error Frame";
      } catch (e) {
        console.warn('Could not set name on fallback frame:', e.message);
      }
      try {
        fallbackFrame.resize(375, 100);
      } catch (e) {
        console.warn('Could not resize fallback frame:', e.message);
      }
      
      if (parentNode.type === 'PAGE') {
        parentNode.appendChild(fallbackFrame);
      }
      
      figma.notify(`âŒ Error creating UI: ${error.message}`, { error: true });
      return fallbackFrame;
    }
  }

  /**
   * Modify existing UI frame by replacing its content
   */
  static async modifyExistingUI(modifiedJSON: any, frameId: string): Promise<FrameNode | null> {
    try {
      const existingFrame = await figma.getNodeByIdAsync(frameId) as FrameNode;
      if (existingFrame && existingFrame.type === 'FRAME') {
        // Remove all existing children
        for (let i = existingFrame.children.length - 1; i >= 0; i--) {
          existingFrame.children[i].remove();
        }
        
        // Generate new content
        await this.generateUIFromData(modifiedJSON, existingFrame);
        
        figma.notify("UI updated successfully!", { timeout: 2000 });
        return existingFrame;
      } else {
        throw new Error("Target frame for modification not found.");
      }
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      figma.notify("Modification error: " + errorMessage, { error: true });
      console.error("âŒ modifyExistingUI error:", e);
      return null;
    }
  }
  
  /**
   * Ensure color styles are loaded before UI generation
   */
  static async ensureColorStylesLoaded(): Promise<void> {
    if (!this.cachedColorStyles) {
      console.log('ðŸŽ¨ Color styles not cached, attempting to load from storage...');
      try {
        const scanSession = await SessionManager.loadLastScanSession();
        if (scanSession?.colorStyles) {
          this.setColorStyles(scanSession.colorStyles);
          console.log('âœ… Color styles loaded from scan session');
        } else {
          console.warn('âš ï¸ No color styles found in storage. Run a design system scan first.');
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to load color styles from storage:', e);
      }
    } else {
      console.log('âœ… Color styles already cached');
    }
  }

  /**
   * Ensure design tokens are loaded before UI generation
   */
  static async ensureDesignTokensLoaded(): Promise<void> {
    if (!this.cachedDesignTokens) {
      console.log('ðŸ”§ Design tokens not cached, attempting to load from storage...');
      try {
        const scanSession = await SessionManager.loadLastScanSession();
        if (scanSession?.designTokens) {
          this.setDesignTokens(scanSession.designTokens);
          console.log('âœ… Design tokens loaded from scan session');
        } else {
          console.warn('âš ï¸ No design tokens found in storage. Run a design system scan first.');
        }
      } catch (e) {
        console.warn('âš ï¸ Failed to load design tokens from storage:', e);
      }
    } else {
      console.log('âœ… Design tokens already cached');
    }
  }

  /**
   * Ensure all cached design system data is loaded (color styles, text styles, design tokens)
   */
  static async ensureDesignSystemDataLoaded(): Promise<void> {
    await this.ensureColorStylesLoaded();
    await this.ensureDesignTokensLoaded();
    // Note: Text styles are loaded differently since they don't have a caching mechanism like colors/tokens
  }

  /**
   * Initialize Color Styles from a scan session
   */
  static setColorStyles(colorStyles: ColorStyleCollection | null): void {
    this.cachedColorStyles = colorStyles;
    if (colorStyles) {
      const totalStyles = Object.values(colorStyles).reduce((sum, styles) => sum + styles.length, 0);
      console.log(`ðŸŽ¨ FigmaRenderer: Loaded ${totalStyles} Color Styles for semantic color resolution`);
    }
  }
  
  /**
   * NEW: Set cached design tokens for renderer to use
   */
  static setDesignTokens(designTokens: DesignToken[]): void {
    this.cachedDesignTokens = designTokens;
    console.log(`ðŸ”§ Cached ${designTokens?.length || 0} design tokens for renderer`);
  }

  /**
   * NEW: Resolve design token names to RGB values
   * Supports various token naming patterns: 'button.primary', 'color-primary-500', 'Primary/500'
   */
  static resolveDesignTokenReference(tokenName: string): RGB | null {
    if (!this.cachedDesignTokens || this.cachedDesignTokens.length === 0) {
      return null;
    }
    
    console.log(`ðŸ”§ Resolving design token: "${tokenName}"`);
    
    // Find exact match first
    const exactMatch = this.cachedDesignTokens.find(token =>
      token.type === 'COLOR' && token.name === tokenName
    );
    
    if (exactMatch) {
      console.log(`âœ… Found exact design token: ${exactMatch.name}`);
      return this.convertTokenValueToRgb(exactMatch.value);
    }
    
    // Try case-insensitive match
    const caseInsensitiveMatch = this.cachedDesignTokens.find(token =>
      token.type === 'COLOR' && token.name.toLowerCase() === tokenName.toLowerCase()
    );
    
    if (caseInsensitiveMatch) {
      console.log(`âœ… Found case-insensitive design token: ${caseInsensitiveMatch.name}`);
      return this.convertTokenValueToRgb(caseInsensitiveMatch.value);
    }
    
    // Try pattern matching: 'collection/name' format
    const collectionMatch = this.cachedDesignTokens.find(token =>
      token.type === 'COLOR' && `${token.collection}/${token.name}`.toLowerCase() === tokenName.toLowerCase()
    );
    
    if (collectionMatch) {
      console.log(`âœ… Found collection-based design token: ${collectionMatch.collection}/${collectionMatch.name}`);
      return this.convertTokenValueToRgb(collectionMatch.value);
    }
    
    console.warn(`âš ï¸ Could not find design token "${tokenName}"`);
    return null;
  }
  
  /**
   * NEW: Convert design token value to RGB
   */
  private static convertTokenValueToRgb(tokenValue: any): RGB | null {
    try {
      // Handle Figma Variables color format: {r: 0.1, g: 0.2, b: 0.3}
      if (typeof tokenValue === 'object' && tokenValue !== null) {
        if ('r' in tokenValue && 'g' in tokenValue && 'b' in tokenValue) {
          return {
            r: Math.max(0, Math.min(1, Number(tokenValue.r) || 0)),
            g: Math.max(0, Math.min(1, Number(tokenValue.g) || 0)),
            b: Math.max(0, Math.min(1, Number(tokenValue.b) || 0))
          };
        }
      }
      
      // Handle hex string format: "#ff0000"
      if (typeof tokenValue === 'string' && tokenValue.startsWith('#')) {
        return this.hexToRgb(tokenValue);
      }
      
      console.warn(`âš ï¸ Unsupported token value format:`, tokenValue);
      return null;
    } catch (error) {
      console.error(`âŒ Error converting token value:`, error);
      return null;
    }
  }

  /**
   * Resolve color style names to actual Figma color styles (for style application)
   * Returns the actual Figma PaintStyle object so styles are applied, not raw colors
   */
  static async resolveColorStyleReference(colorStyleName: string): Promise<PaintStyle | null> {
    console.log(`ðŸŽ¨ Resolving color style reference: "${colorStyleName}"`);
    
    try {
      // Get all local paint styles from Figma
      const localPaintStyles = await figma.getLocalPaintStylesAsync();
      console.log(`ðŸ“‹ Found ${localPaintStyles.length} local paint styles in Figma`);
      
      // Debug: Show first few style names
      if (localPaintStyles.length > 0) {
        console.log(`ðŸ“‹ First 5 style names:`, localPaintStyles.slice(0, 5).map(s => s.name));
      }
      
      // Find exact match first
      const exactMatch = localPaintStyles.find(style => style.name === colorStyleName);
      if (exactMatch) {
        console.log(`âœ… Found exact color style: ${exactMatch.name}`);
        return exactMatch;
      }
      
      // Fallback: case-insensitive search
      const caseInsensitiveMatch = localPaintStyles.find(style =>
        style.name.toLowerCase() === colorStyleName.toLowerCase()
      );
      if (caseInsensitiveMatch) {
        console.log(`âœ… Found case-insensitive color style: ${caseInsensitiveMatch.name}`);
        return caseInsensitiveMatch;
      }
      
      console.warn(`âš ï¸ Could not find color style "${colorStyleName}"`);
      console.log(`ðŸ“‹ All available paint styles:`, localPaintStyles.map(s => s.name));
      return null;
      
    } catch (error) {
      console.error(`âŒ Error resolving color style "${colorStyleName}":`, error);
      return null;
    }
  }

  /**
   * ENHANCED: Resolve color references with 3-tier fallback system
   * 1. Design Tokens (preferred)
   * 2. Color Styles (legacy)
   * 3. Semantic color fallback
   */
  static resolveColorReference(colorName: string): RGB | null {
    console.log(`ðŸŽ¨ Resolving color: "${colorName}" with 3-tier system`);
    
    // Tier 1: Try design tokens first (modern approach)
    const tokenColor = this.resolveDesignTokenReference(colorName);
    if (tokenColor) {
      console.log(`âœ… Resolved via design token`);
      return tokenColor;
    }
    
    // Tier 2: Fallback to color styles (legacy approach)
    const styleColor = this.resolveSemanticColor(colorName);
    if (styleColor && !(styleColor.r === 0 && styleColor.g === 0 && styleColor.b === 0)) {
      console.log(`âœ… Resolved via color style`);
      return styleColor;
    }
    
    // Tier 3: Ultimate fallback
    console.warn(`âš ï¸ Could not resolve color "${colorName}" through any method`);
    return { r: 0, g: 0, b: 0 }; // Black fallback
  }

  /**
   * Resolve color style names to actual RGB values from scanned Color Styles (fallback)
   * Uses exact name matching from design system scan data
   * Examples: "Primary/primary80", "Button-color", "Light Green", "ui-primary-500"
   */
  static resolveSemanticColor(colorStyleName: string): RGB | null {
    if (!this.cachedColorStyles) {
      console.warn(`âš ï¸ No Color Styles loaded. Call setColorStyles() first or run a design system scan.`);
      return null;
    }
    
    console.log(`ðŸŽ¨ Resolving color style: "${colorStyleName}"`);
    
    // Search all categories for exact name match
    const allCategories = Object.values(this.cachedColorStyles).flat();
    const exactMatch = allCategories.find(style => style.name === colorStyleName);
    
    if (exactMatch && exactMatch.colorInfo.type === 'SOLID') {
      console.log(`âœ… Found exact match: ${exactMatch.name} (${exactMatch.colorInfo.color})`);
      return this.hexToRgb(exactMatch.colorInfo.color || '#000000');
    }
    
    // Fallback: case-insensitive search
    const caseInsensitiveMatch = allCategories.find(style =>
      style.name.toLowerCase() === colorStyleName.toLowerCase()
    );
    
    if (caseInsensitiveMatch && caseInsensitiveMatch.colorInfo.type === 'SOLID') {
      console.log(`âœ… Found case-insensitive match: ${caseInsensitiveMatch.name} (${caseInsensitiveMatch.colorInfo.color})`);
      return this.hexToRgb(caseInsensitiveMatch.colorInfo.color || '#000000');
    }
    
    console.warn(`âš ï¸ Could not find color style "${colorStyleName}"`);
    console.log(`Available color styles:`, allCategories.map(s => s.name));
    
    // Return black as fallback
    return { r: 0, g: 0, b: 0 };
  }
  
  
  /**
   * Convert hex color to RGB values (0-1 range)
   */
  private static hexToRgb(hex: string): RGB {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex codes
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return { r, g, b };
  }
  
  /**
   * Create a solid paint from RGB values
   */
  static createSolidPaint(rgb: RGB, opacity: number = 1): Paint {
    return {
      type: 'SOLID',
      color: rgb,
      opacity: opacity
    };
  }
  
  /**
   * Helper method to resolve and apply semantic colors to text nodes
   */
  static applySemanticTextColor(textNode: TextNode, semanticColorName: string): boolean {
    const rgb = this.resolveColorReference(semanticColorName);
    if (rgb) {
      textNode.fills = [this.createSolidPaint(rgb)];
      console.log(`âœ… Applied semantic color "${semanticColorName}" to text node`);
      return true;
    }
    return false;
  }
  
  /**
   * Helper method to resolve and apply color styles to any node with fills
   */
  static async applySemanticFillColor(node: SceneNode & { fills?: ReadonlyArray<Paint> | symbol, setFillStyleIdAsync?: Function }, semanticColorName: string): Promise<boolean> {
    // Try to apply actual Figma color style first
    const colorStyle = await this.resolveColorStyleReference(semanticColorName);
    if (colorStyle && 'setFillStyleIdAsync' in node) {
      await (node as any).setFillStyleIdAsync(colorStyle.id);
      console.log(`âœ… Applied color style "${semanticColorName}" to node (as style reference)`);
      return true;
    }
    
    // Fallback to RGB color if style not found
    const rgb = this.resolveColorReference(semanticColorName);
    if (rgb && 'fills' in node) {
      (node as any).fills = [this.createSolidPaint(rgb)];
      console.log(`âœ… Applied semantic fill color "${semanticColorName}" to node (as RGB fallback)`);
      return true;
    }
    return false;
  }
  
  // Text Styles Caching and Resolution
  
  /**
   * Sets the cached text styles for the renderer
   * Mirrors setColorStyles pattern exactly
   */
  static setTextStyles(textStyles: TextStyle[]): void {
    FigmaRenderer.cachedTextStyles = textStyles;
    console.log(`ðŸ“ Cached ${textStyles.length} text styles for rendering`);
    
    // Log available text styles for debugging
    if (textStyles.length > 0) {
      console.log('Available text styles:', textStyles.map(s => s.name).join(', '));
    }
  }

  /**
   * Resolves text style name to Figma text style ID
   * Mirrors resolveColorStyleReference pattern
   */
  static async resolveTextStyleReference(textStyleName: string): Promise<TextStyle | null> {
    console.log(`ðŸ“ Resolving text style reference: "${textStyleName}"`);
    
    try {
      // Get all local text styles from Figma
      const localTextStyles = await figma.getLocalTextStylesAsync();
      console.log(`ðŸ“‹ Found ${localTextStyles.length} local text styles in Figma`);
      
      // Debug: Show first few style names
      if (localTextStyles.length > 0) {
        console.log(`ðŸ“‹ First 5 text style names:`, localTextStyles.slice(0, 5).map(s => s.name));
      }
      
      // Find exact match first
      const exactMatch = localTextStyles.find(style => style.name === textStyleName);
      if (exactMatch) {
        console.log(`âœ… Found exact text style: ${exactMatch.name}`);
        return exactMatch;
      }
      
      // Fallback: case-insensitive search
      const caseInsensitiveMatch = localTextStyles.find(style =>
        style.name.toLowerCase() === textStyleName.toLowerCase()
      );
      if (caseInsensitiveMatch) {
        console.log(`âœ… Found case-insensitive text style: ${caseInsensitiveMatch.name}`);
        return caseInsensitiveMatch;
      }
      
      console.warn(`âš ï¸ Could not find text style "${textStyleName}"`);
      console.log(`ðŸ“‹ All available text styles:`, localTextStyles.map(s => s.name));
      return null;
      
    } catch (error) {
      console.error(`âŒ Error resolving text style "${textStyleName}":`, error);
      return null;
    }
  }

  /**
   * Applies text style to a text node
   */
  static async applyTextStyle(textNode: TextNode, textStyleName: string): Promise<void> {
    try {
      console.log(`ðŸ“ Attempting to apply text style: "${textStyleName}"`);
      const textStyle = await FigmaRenderer.resolveTextStyleReference(textStyleName);
      if (textStyle) {
        console.log(`ðŸ“ Text style found - ID: ${textStyle.id}, Name: ${textStyle.name}`);
        await textNode.setTextStyleIdAsync(textStyle.id);
        console.log(`âœ… Applied text style "${textStyleName}" to text node`);
      } else {
        console.warn(`âŒ Could not apply text style "${textStyleName}" - style not found`);
      }
    } catch (error) {
      console.error(`âŒ Error applying text style "${textStyleName}":`, error);
      console.error(`âŒ Error details:`, {
        errorMessage: error.message,
        errorStack: error.stack,
        textStyleName: textStyleName,
        textNodeType: textNode?.type,
        textNodeId: textNode?.id
      });
    }
  }

  /**
   * Validates native element types and provides fallbacks
   */
  static validateNativeType(type: string): string | null {
    const ALLOWED_NATIVE_TYPES = ['native-text', 'native-rectangle', 'native-circle'];
    
    if (ALLOWED_NATIVE_TYPES.includes(type)) {
      return type;
    }
    
    // Attempt intelligent fallback
    const fallbackMap: Record<string, string> = {
      'native-grid': 'layoutContainer',
      'native-list-item': 'layoutContainer',
      'native-rating': 'native-rectangle',
      'native-image': 'native-rectangle',
      'native-vertical-scroll': 'layoutContainer',
      'native-horizontal-scroll': 'layoutContainer'
    };
    
    if (fallbackMap[type]) {
      console.warn(`âš ï¸ Unknown native type "${type}" - falling back to "${fallbackMap[type]}"`);
      return fallbackMap[type];
    }
    
    console.error(`âŒ Unknown native type "${type}" - no fallback available`);
    return null;
  }

  /**
   * Sanitizes width properties to handle percentages and invalid values
   */
  static sanitizeWidth(width: any): number | null {
    // Handle percentage strings
    if (typeof width === 'string') {
      // Remove percentage and convert
      if (width.endsWith('%')) {
        const percentage = parseFloat(width);
        if (width === '100%') {
          console.warn('âš ï¸ Converting width "100%" to horizontalSizing: "FILL"');
          return null; // Signal to use FILL instead
        } else {
          // Convert percentage to approximate fixed width
          const defaultContainerWidth = 375; // Mobile width
          const calculated = (defaultContainerWidth * percentage) / 100;
          console.warn(`âš ï¸ Converting width "${width}" to ${calculated}px`);
          return calculated;
        }
      }
      
      // Try parsing as number
      const parsed = parseFloat(width);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    if (typeof width === 'number') {
      return width;
    }
    
    console.warn(`âš ï¸ Invalid width value: ${width}`);
    return null;
  }

  /**
   * Normalizes property names to match component schemas
   */
  static normalizePropertyNames(properties: any, textLayers?: string[]): any {
    if (!properties) return {};
    
    const normalized = {...properties};
    
    // Common property aliases
    const aliases: Record<string, string[]> = {
      'Action': ['text', 'label', 'action', 'Default', 'buttonText'],
      'label-text': ['label', 'labelText', 'text'],
      'placeholder-text': ['placeholder', 'placeholderText'],
      'isPassword': ['isSecure', 'secure', 'password'],
      'Headline': ['title', 'heading', 'headline'],
      'Supporting text': ['subtitle', 'description', 'supportingText'],
      'Default': ['text', 'content', 'label']
    };
    
    // If we have schema, use it for validation
    if (textLayers && textLayers.length > 0) {
      Object.keys(properties).forEach(propName => {
        if (!textLayers.includes(propName)) {
          // Find correct property name
          for (const [correct, wrongNames] of Object.entries(aliases)) {
            if (wrongNames.includes(propName) && textLayers.includes(correct)) {
              console.warn(`âš ï¸ Normalizing property "${propName}" to "${correct}"`);
              normalized[correct] = properties[propName];
              delete normalized[propName];
              break;
            }
          }
        }
      });
    }
    
    return normalized;
  }

  /**
   * Validates and fixes component variants
   */
  static validateAndFixVariants(
    variants: any,
    variantDetails: any
  ): any {
    if (!variants || !variantDetails) {
      return variants || {};
    }
    
    const fixed = {...variants};
    
    // Validate existing variants
    Object.entries(variants).forEach(([propName, value]) => {
      const validValues = variantDetails[propName];
      
      if (!validValues) {
        console.warn(`âš ï¸ Unknown variant property "${propName}" - removing`);
        delete fixed[propName];
        return;
      }
      
      // Check if value is valid
      if (!validValues.includes(value)) {
        // Try case-insensitive match
        const match = validValues.find((v: string) =>
          v.toLowerCase() === String(value).toLowerCase()
        );
        
        if (match) {
          console.warn(`âš ï¸ Fixing variant case: "${value}" â†’ "${match}"`);
          fixed[propName] = match;
        } else {
          console.warn(`âš ï¸ Invalid variant value "${value}" for "${propName}". Using default: "${validValues[0]}"`);
          fixed[propName] = validValues[0];
        }
      }
    });
    
    // Add missing required variants
    Object.entries(variantDetails).forEach(([propName, values]: [string, any]) => {
      if (!fixed[propName] && Array.isArray(values) && values.length > 0) {
        console.warn(`âš ï¸ Adding missing variant "${propName}" with default: "${values[0]}"`);
        fixed[propName] = values[0];
      }
    });
    
    return fixed;
  }

  /**
   * Pre-render validation of entire layout data
   */
  static validateLayoutData(layoutData: any): {valid: boolean, errors: string[], warnings: string[]} {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate root structure
    if (!layoutData.layoutContainer && !layoutData.items) {
      errors.push('Missing layoutContainer or items at root level');
    }
    
    // Recursive validation function
    const validateItems = (items: any[], path: string = '') => {
      if (!Array.isArray(items)) return;
      
      items.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        
        // Check for unknown native types
        if (item.type?.startsWith('native-') &&
            !['native-text', 'native-rectangle', 'native-circle'].includes(item.type)) {
          warnings.push(`Invalid native type "${item.type}" at ${itemPath} - will attempt fallback`);
        }
        
        // Check for percentage widths
        if (typeof item.width === 'string' && item.width.includes('%')) {
          warnings.push(`Percentage width "${item.width}" at ${itemPath} - will convert`);
        }
        
        if (typeof item.properties?.width === 'string' && item.properties.width.includes('%')) {
          warnings.push(`Percentage width "${item.properties.width}" in properties at ${itemPath} - will convert`);
        }
        
        // Check for component ID
        if (item.type === 'component') {
          if (!item.componentNodeId && !item.componentId && !item.id) {
            errors.push(`Missing component ID at ${itemPath}`);
          } else if (!item.componentNodeId) {
            warnings.push(`Using legacy property name for component ID at ${itemPath} - will normalize`);
          }
        }
        
        // Recurse into nested items
        if (item.items) {
          validateItems(item.items, `${itemPath}.items`);
        }
        if (item.layoutContainer?.items) {
          validateItems(item.layoutContainer.items, `${itemPath}.layoutContainer.items`);
        }
      });
    };
    
    const items = layoutData.items || layoutData.layoutContainer?.items;
    if (items) {
      validateItems(items);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Creates a visual placeholder for missing components
   */
  static async createMissingComponentPlaceholder(
    componentId: string,
    parentNode: FrameNode
  ): Promise<RectangleNode> {
    const placeholder = figma.createRectangle();
    placeholder.name = `Missing Component: ${componentId}`;
    placeholder.fills = [{type: 'SOLID', color: {r: 1, g: 0.9, b: 0.9}}];
    placeholder.resize(200, 100);
    placeholder.cornerRadius = 8;
    placeholder.strokes = [{type: 'SOLID', color: {r: 0.8, g: 0.2, b: 0.2}}];
    placeholder.strokeWeight = 2;
    placeholder.dashPattern = [5, 5];
    parentNode.appendChild(placeholder);
    
    try {
      const text = figma.createText();
      await figma.loadFontAsync({family: "Inter", style: "Regular"});
      text.characters = `Component\n${componentId}\nnot found`;
      text.fontSize = 12;
      text.fills = [{type: 'SOLID', color: {r: 0.5, g: 0.5, b: 0.5}}];
      text.textAlignHorizontal = 'CENTER';
      text.textAlignVertical = 'CENTER';
      text.resize(200, 100);
      placeholder.appendChild(text);
    } catch (e) {
      console.warn('Could not add text to placeholder:', e);
    }
    
    return placeholder;
  }
}
