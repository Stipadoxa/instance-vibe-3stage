// src/core/design-system-scanner-service.ts
// Design System Scanner service for AIDesigner plugin - handles all component scanning logic

import { ComponentInfo } from './session-manager';
import { ComponentScanner, ScanSession } from './component-scanner';
import { FigmaRenderer } from './figma-renderer';

interface ScanProgressCallback {
    (progress: { current: number; total: number; status: string }): void;
}

export class DesignSystemScannerService {
    
    /**
     * Main scanning function - scans all pages for components, Color Styles, and Text Styles
     */
    static async scanDesignSystem(progressCallback?: ScanProgressCallback): Promise<ScanSession> {
        console.log("🔍 Starting comprehensive design system scan with Color Styles and Text Styles...");
        
        try {
            progressCallback?.({ current: 0, total: 100, status: "Initializing comprehensive scan..." });
            
            // Use the enhanced ComponentScanner that includes Color Styles and Text Styles
            const scanSession = await ComponentScanner.scanDesignSystem();
            
            progressCallback?.({ current: 50, total: 100, status: "Integrating Color Styles and Text Styles with renderer..." });
            
            // Initialize the FigmaRenderer with the scanned Color Styles
            FigmaRenderer.setColorStyles(scanSession.colorStyles || null);
            
            // Initialize the FigmaRenderer with the scanned Text Styles
            if (scanSession.textStyles && scanSession.textStyles.length > 0) {
                FigmaRenderer.setTextStyles(scanSession.textStyles);
                console.log(`📝 Loaded ${scanSession.textStyles.length} text styles into renderer`);
            } else {
                console.log("📝 No text styles found in scan session");
            }
            
            // Initialize the FigmaRenderer with the scanned Design Tokens
            if (scanSession.designTokens && scanSession.designTokens.length > 0) {
                FigmaRenderer.setDesignTokens(scanSession.designTokens);
                console.log(`🔧 Loaded ${scanSession.designTokens.length} design tokens into renderer`);
            } else {
                console.log("🔧 No design tokens found in scan session");
            }
            
            progressCallback?.({ current: 100, total: 100, status: "Comprehensive scan complete!" });
            
            return scanSession;
        } catch (e) {
            console.error("❌ Critical error in comprehensive design system scan:", e);
            throw e;
        }
    }
    
    /**
     * Legacy method for backward compatibility - returns only components
     */
    static async scanComponents(progressCallback?: ScanProgressCallback): Promise<ComponentInfo[]> {
        const session = await this.scanDesignSystem(progressCallback);
        return session.components;
    }
    
    /**
     * Scan only Color Styles without components
     */
    static async scanColorStyles(): Promise<any> {
        console.log("🎨 Scanning only Color Styles...");
        
        try {
            const colorStyles = await ComponentScanner.scanFigmaColorStyles();
            FigmaRenderer.setColorStyles(colorStyles);
            return colorStyles;
        } catch (e) {
            console.error("❌ Error scanning Color Styles:", e);
            throw e;
        }
    }
    
    /**
     * Scan only Text Styles without components
     */
    static async scanTextStyles(): Promise<any> {
        console.log("📝 Scanning only Text Styles...");
        
        try {
            const textStyles = await ComponentScanner.scanFigmaTextStyles();
            FigmaRenderer.setTextStyles(textStyles);
            return textStyles;
        } catch (e) {
            console.error("❌ Error scanning Text Styles:", e);
            throw e;
        }
    }
    
    /**
     * Scan only Design Tokens without components
     */
    static async scanDesignTokens(): Promise<any> {
        console.log("🔧 Scanning only Design Tokens...");
        
        try {
            const designTokens = await ComponentScanner.scanFigmaVariables();
            FigmaRenderer.setDesignTokens(designTokens);
            return designTokens;
        } catch (e) {
            console.error("❌ Error scanning Design Tokens:", e);
            throw e;
        }
    }
    
    // Remove the old implementation below and replace with legacy support
    private static async legacyScanImplementation(progressCallback?: ScanProgressCallback): Promise<ComponentInfo[]> {
        console.log("🔍 Starting legacy design system scan...");
        const components: ComponentInfo[] = [];
        
        try {
            // Load all pages first
            await figma.loadAllPagesAsync();
            console.log("✅ All pages loaded");
            
            const totalPages = figma.root.children.length;
            let currentPage = 0;
            
            progressCallback?.({ current: 0, total: totalPages, status: "Initializing scan..." });
            
            for (const page of figma.root.children) {
                currentPage++;
                const pageStatus = `Scanning page: "${page.name}" (${currentPage}/${totalPages})`;
                console.log(`📋 ${pageStatus}`);
                
                progressCallback?.({ 
                    current: currentPage, 
                    total: totalPages, 
                    status: pageStatus 
                });
                
                try {
                    // Find all COMPONENT and COMPONENT_SET nodes
                    const allNodes = page.findAll(node => {
                        if (node.type === 'COMPONENT_SET') {
                            return true;
                        }
                        if (node.type === 'COMPONENT') {
                            // Only include components that are not part of a component set
                            return !!(node.parent && node.parent.type !== 'COMPONENT_SET');
                        }
                        return false;
                    });
                    
                    console.log(`✅ Found ${allNodes.length} main components on page "${page.name}"`);
                    
                    // Analyze each component
                    for (const node of allNodes) {
                        try {
                            if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
                                const componentInfo = await ComponentScanner.analyzeComponent(node as ComponentNode | ComponentSetNode);
                                if (componentInfo) {
                                    // Add page information
                                    componentInfo.pageInfo = {
                                        pageName: page.name,
                                        pageId: page.id,
                                        isCurrentPage: page.id === figma.currentPage.id
                                    };
                                    components.push(componentInfo);
                                }
                            }
                        } catch (e) {
                            console.error(`❌ Error analyzing component "${node.name}":`, e);
                        }
                    }
                } catch (e) {
                    console.error(`❌ Error scanning page "${page.name}":`, e);
                }
            }
            
            progressCallback?.({ 
                current: totalPages, 
                total: totalPages, 
                status: `Scan complete! Found ${components.length} components` 
            });
            
            console.log(`🎉 Design system scan complete! Found ${components.length} unique components.`);
            return components;
            
        } catch (e) {
            console.error("❌ Critical error in design system scan:", e);
            throw e;
        }
    }

    /**
     * Generate LLM prompt with components and color styles
     */
    static generateLLMPrompt(components: ComponentInfo[], colorStyles?: any): string {
        return ComponentScanner.generateLLMPrompt(components, colorStyles);
    }

    /**
     * Analyzes a single component to extract metadata and variants
     * @deprecated Use ComponentScanner.analyzeComponent instead
     */
    static analyzeComponent(comp: ComponentNode | ComponentSetNode): ComponentInfo {
        const name = comp.name;
        const suggestedType = this.guessComponentType(name.toLowerCase());
        const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
        const textLayers = this.findTextLayers(comp);
        
        let variants: string[] = [];
        let variantDetails: { [key: string]: string[] } = {};
        
        // Extract variant information for COMPONENT_SET nodes
        if (comp.type === 'COMPONENT_SET') {
            const variantProps = comp.variantGroupProperties;
            if (variantProps) {
                variants = Object.keys(variantProps);
                
                Object.entries(variantProps).forEach(([propName, propInfo]) => {
                    if (propInfo.values && propInfo.values.length > 0) {
                        variantDetails[propName] = [...propInfo.values].sort();
                        console.log(`✅ Found variant property: ${propName} with values: [${propInfo.values.join(', ')}]`);
                    }
                });
                
                console.log(`🎯 Variant details for "${comp.name}":`, variantDetails);
            }
        }
        
        return {
            id: comp.id,
            name: name,
            suggestedType,
            confidence,
            variants: variants.length > 0 ? variants : undefined,
            variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : undefined,
            textLayers: textLayers.length > 0 ? textLayers : undefined,
            isFromLibrary: false
        };
    }

    /**
     * Intelligent component type detection based on naming patterns
     */
    static guessComponentType(name: string): string {
        const patterns: {[key: string]: RegExp} = {
            'icon-button': /icon.*button|button.*icon/i,
            'upload': /upload|file.*drop|drop.*zone|attach/i,
            'form': /form|captcha|verification/i,
            'context-menu': /context-menu|context menu|contextual menu|options menu/i,
            'modal-header': /modal-header|modal header|modalstack|modal_stack/i,
            'list-item': /list-item|list item|list_item|list[\s\-_]*row|list[\s\-_]*cell/i,
            'appbar': /appbar|app-bar|navbar|nav-bar|header|top bar|page header/i,
            'dialog': /dialog|dialogue|popup|modal(?!-header)/i,
            'list': /list(?!-item)/i,
            'navigation': /nav|navigation(?!-bar)/i,
            'header': /h[1-6]|title|heading(?! bar)/i,
            'button': /button|btn|cta|action/i,
            'input': /input|field|textfield|text-field|entry/i,
            'textarea': /textarea|text-area|multiline/i,
            'select': /select|dropdown|drop-down|picker/i,
            'checkbox': /checkbox|check-box/i,
            'radio': /radio|radiobutton|radio-button/i,
            'switch': /switch|toggle/i,
            'slider': /slider|range/i,
            'searchbar': /search|searchbar|search-bar/i,
            'tab': /tab|tabs|tabbar|tab-bar/i,
            'breadcrumb': /breadcrumb|bread-crumb/i,
            'pagination': /pagination|pager/i,
            'bottomsheet': /bottomsheet|bottom-sheet|drawer/i,
            'sidebar': /sidebar|side-bar/i,
            'snackbar': /snack|snackbar|toast|notification/i,
            'alert': /alert/i,
            'tooltip': /tooltip|tip|hint/i,
            'badge': /badge|indicator|count/i,
            'progress': /progress|loader|loading|spinner/i,
            'skeleton': /skeleton|placeholder/i,
            'card': /card|tile|block|panel/i,
            'avatar': /avatar|profile|user|photo/i,
            'image': /image|img|picture/i,
            'video': /video|player/i,
            'icon': /icon|pictogram|symbol/i,
            'text': /text|label|paragraph|caption|copy/i,
            'link': /link|anchor/i,
            'container': /container|wrapper|box|frame/i,
            'grid': /grid/i,
            'divider': /divider|separator|delimiter/i,
            'spacer': /spacer|space|gap/i,
            'fab': /fab|floating|float/i,
            'chip': /chip|tag/i,
            'actionsheet': /actionsheet|action-sheet/i,
            'chart': /chart|graph/i,
            'table': /table/i,
            'calendar': /calendar|date/i,
            'timeline': /timeline/i,
            'gallery': /gallery|carousel/i,
            'price': /price|cost/i,
            'rating': /rating|star/i,
            'cart': /cart|basket/i,
            'map': /map|location/i,
            'code': /code|syntax/i,
            'terminal': /terminal|console/i
        };
        
        // Priority patterns for better matching
        const priorityPatterns = [
            'icon-button', 'upload', 'form', 'context-menu', 'modal-header', 'list-item', 
            'appbar', 'dialog', 'snackbar', 'bottomsheet', 'actionsheet', 'searchbar', 
            'fab', 'breadcrumb', 'pagination', 'skeleton', 'textarea', 'checkbox', 
            'radio', 'switch', 'slider', 'tab', 'navigation', 'tooltip', 'badge', 
            'progress', 'avatar', 'chip', 'stepper', 'chart', 'table', 'calendar', 
            'timeline', 'gallery', 'rating'
        ];
        
        // Check priority patterns first
        for (const type of priorityPatterns) {
            if (patterns[type]?.test(name)) return type;
        }
        
        // Check remaining patterns
        for (const type in patterns) {
            if (patterns.hasOwnProperty(type) && !priorityPatterns.includes(type)) {
                if (patterns[type].test(name)) return type;
            }
        }
        
        return 'unknown';
    }

    /**
     * Calculates confidence score for component type detection
     */
    static calculateConfidence(name: string, suggestedType: string): number {
        if (suggestedType === 'unknown') return 0.1;
        if (name.toLowerCase() === suggestedType.toLowerCase()) return 0.95;
        if (name.includes(suggestedType)) return 0.9;
        if (name.toLowerCase().includes(suggestedType + '-') || name.toLowerCase().includes(suggestedType + '_')) return 0.85;
        return 0.7;
    }

    /**
     * Finds and catalogs text layers within a component
     */
    static findTextLayers(comp: ComponentNode | ComponentSetNode): string[] {
        const textLayers: string[] = [];
        try {
            // Use default variant for component sets, otherwise use the component directly
            const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                const allNodes = (nodeToAnalyze as ComponentNode).findAll((node) => node.type === 'TEXT');
                
                allNodes.forEach(node => {
                    if (node.type === 'TEXT' && node.name) {
                        const textNode = node as TextNode;
                        textLayers.push(textNode.name);
                        
                        try {
                            const chars = textNode.characters || '[empty]';
                            console.log(`📝 Found text layer: "${textNode.name}" with content: "${chars}"`);
                        } catch (charError) {
                            console.log(`📝 Found text layer: "${textNode.name}" (could not read characters)`);
                        }
                    }
                });
            }
        } catch (e) {
            console.error(`Error finding text layers in "${comp.name}":`, e);
        }
        return textLayers;
    }


    /**
     * Save scan results to Figma storage - supports full scan session with color styles, text styles, and design tokens
     */
    static async saveScanResults(components: ComponentInfo[], colorStyles?: any, textStyles?: any, designTokens?: any): Promise<void> {
        try {
            const scanSession: ScanSession = {
                components,
                colorStyles: colorStyles || undefined,
                textStyles: textStyles || undefined,
                designTokens: designTokens || undefined,
                scanTime: Date.now(),
                version: "2.1.0",
                fileKey: figma.fileKey || figma.root.id
            };
            
            await figma.clientStorage.setAsync('design-system-scan', scanSession);
            await figma.clientStorage.setAsync('last-scan-results', components);
            
            const colorStylesCount = colorStyles ? Object.values(colorStyles).reduce((sum: number, styles: any[]) => sum + styles.length, 0) : 0;
            const textStylesCount = textStyles ? textStyles.length : 0;
            const designTokensCount = designTokens ? designTokens.length : 0;
            console.log(`💾 Saved ${components.length} components, ${colorStylesCount} color styles, ${textStylesCount} text styles, and ${designTokensCount} design tokens with session data`);
        } catch (error) {
            console.error("❌ Error saving scan results:", error);
            try {
                // Fallback save
                await figma.clientStorage.setAsync('last-scan-results', components);
                console.log("💾 Fallback save successful");
            } catch (fallbackError) {
                console.warn("⚠️ Could not save scan results:", fallbackError);
            }
        }
    }
    
    /**
     * Save complete scan session including color styles, text styles, and design tokens
     */
    static async saveScanSession(scanSession: ScanSession): Promise<void> {
        try {
            await figma.clientStorage.setAsync('design-system-scan', scanSession);
            await figma.clientStorage.setAsync('last-scan-results', scanSession.components);
            
            const colorStylesCount = scanSession.colorStyles ? Object.values(scanSession.colorStyles).reduce((sum: number, styles: any[]) => sum + styles.length, 0) : 0;
            const textStylesCount = scanSession.textStyles ? scanSession.textStyles.length : 0;
            const designTokensCount = scanSession.designTokens ? scanSession.designTokens.length : 0;
            console.log(`💾 Saved complete scan session: ${scanSession.components.length} components, ${colorStylesCount} color styles, ${textStylesCount} text styles, and ${designTokensCount} design tokens`);
        } catch (error) {
            console.error("❌ Error saving scan session:", error);
            throw error;
        }
    }

    /**
     * Get component ID by type for UI generation
     */
    static async getComponentIdByType(type: string): Promise<string | null> {
        const searchType = type.toLowerCase();
        const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
        
        if (scanResults && Array.isArray(scanResults)) {
            // First try exact type match with good confidence
            const matchingComponent = scanResults.find((comp) => 
                comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7
            );
            if (matchingComponent) return matchingComponent.id;
            
            // Fallback to name matching
            const nameMatchingComponent = scanResults.find((comp) => 
                comp.name.toLowerCase().includes(searchType)
            );
            if (nameMatchingComponent) return nameMatchingComponent.id;
        }
        
        console.log(`❌ Component ID for type "${type}" not found`);
        return null;
    }

    /**
     * Get saved scan results from storage
     */
    static async getSavedScanResults(): Promise<ComponentInfo[] | null> {
        try {
            const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
            return scanResults || null;
        } catch (error) {
            console.error("❌ Error getting saved scan results:", error);
            return null;
        }
    }

    /**
     * Get scan session data
     */
    static async getScanSession(): Promise<ScanSession | null> {
        try {
            const scanSession: ScanSession | undefined = await figma.clientStorage.getAsync('design-system-scan');
            return scanSession || null;
        } catch (error) {
            console.error("❌ Error getting scan session:", error);
            return null;
        }
    }

    /**
     * Update component type manually
     */
    static async updateComponentType(componentId: string, newType: string): Promise<{ success: boolean; componentName?: string }> {
        try {
            const scanResults: ComponentInfo[] | undefined = await figma.clientStorage.getAsync('last-scan-results');
            if (scanResults && Array.isArray(scanResults)) {
                let componentName = '';
                const updatedResults = scanResults.map(comp => {
                    if (comp.id === componentId) {
                        componentName = comp.name;
                        return { ...comp, suggestedType: newType, confidence: 1.0 };
                    }
                    return comp;
                });
                
                await this.saveScanResults(updatedResults);
                return { success: true, componentName };
            }
            return { success: false };
        } catch (error) {
            console.error("❌ Error updating component type:", error);
            return { success: false };
        }
    }

    /**
     * Clear all scan data and renderer cache
     */
    static async clearScanData(): Promise<void> {
        try {
            await figma.clientStorage.setAsync('design-system-scan', null);
            await figma.clientStorage.setAsync('last-scan-results', null);
            
            // Clear renderer caches
            FigmaRenderer.setColorStyles(null);
            FigmaRenderer.setTextStyles([]);
            FigmaRenderer.setDesignTokens([]);
            
            console.log("✅ Scan data and renderer cache cleared");
        } catch (error) {
            console.error("❌ Error clearing scan data:", error);
        }
    }
}