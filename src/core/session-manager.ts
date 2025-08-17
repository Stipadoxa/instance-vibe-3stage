// session-manager.ts
// Session state management for AIDesigner

export interface VariableDetails {
  id: string;
  name: string;
  resolvedType: 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
  scopes: string[];
  collection?: string;
}

export interface ColorInfo {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  color?: string; // hex code for solid colors
  opacity?: number;
  gradientStops?: Array<{
    color: string;
    position: number;
  }>;
  
  // NEW: Design System color style references
  paintStyleId?: string;           // Color style ID from Design System for fast rendering
  paintStyleName?: string;         // Style name for JSON Engineer lookup and fallback
  boundVariables?: any;            // Bound variables for color style
  usesDesignSystemColor?: boolean; // Flag indicating Design System usage
  
  // NEW: Design Token fields
  designToken?: string;            // Variable name (e.g., "Primary/Blue/500")
  usesDesignToken?: boolean;       // Flag indicating Design Token usage
}

export interface StyleInfo {
  fills?: ColorInfo[];
  strokes?: ColorInfo[];
  backgroundColor?: ColorInfo;
  primaryColor?: ColorInfo; // Most prominent color
  textColor?: ColorInfo; // Primary text color
}

export interface TextHierarchy {
  nodeName: string;
  nodeId: string;
  fontSize: number;
  fontWeight: string | number;
  classification: 'primary' | 'secondary' | 'tertiary';
  visible: boolean;
  characters?: string;
  textColor?: ColorInfo;
  
  // NEW: Design System text style references
  textStyleId?: string;           // Text style ID from Design System for fast rendering
  textStyleName?: string;         // Style name for JSON Engineer lookup and fallback
  boundTextStyleId?: string;      // Bound variable for text style
  usesDesignSystemStyle?: boolean; // Flag indicating Design System usage
}

// NEW: Interface for exact text style matching
export interface TextStyleDetails {
  id: string;
  name: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
}

export interface ComponentInstance {
  nodeName: string;
  nodeId: string;
  componentId?: string;
  visible: boolean;
}

export interface VectorNode {
  nodeName: string;
  nodeId: string;
  visible: boolean;
}

export interface ImageNode {
  nodeName: string;
  nodeId: string;
  nodeType: 'RECTANGLE' | 'ELLIPSE';
  visible: boolean;
  hasImageFill: boolean;
}

// NEW: Interface for auto-layout behavior analysis
export interface AutoLayoutBehavior {
  isAutoLayout: boolean;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'WRAP' | 'NONE';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  
  // Sizing behavior
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  
  // Spacing & padding
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  
  // Alignment
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  counterAxisAlignContent?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  
  // Additional properties
  itemReverseZIndex?: boolean;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  
  // Children behavior (for nested auto-layout analysis)
  childrenAutoLayoutBehavior?: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    layoutAlign?: 'INHERIT' | 'STRETCH';
    layoutGrow?: number;
    layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
    layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
    autoLayoutBehavior?: AutoLayoutBehavior; // Recursive for nested auto-layout
  }>;
}

// NEW: Hierarchical component structure interface
export interface ComponentStructure {
  id: string;
  type: string; // 'TEXT' | 'VECTOR' | 'RECTANGLE' | 'ELLIPSE' | 'COMPONENT' | 'INSTANCE' | 'FRAME' | etc.
  name: string;
  children: ComponentStructure[];
  parent?: string; // Parent node ID
  depth: number; // Depth in component hierarchy (0 = root)
  visible: boolean;
  
  // Node-specific properties
  nodeProperties?: {
    // Text properties (if type === 'TEXT')
    textHierarchy?: TextHierarchy;
    
    // Component instance properties (if type === 'COMPONENT' || 'INSTANCE')
    componentInstance?: ComponentInstance;
    
    // Vector properties (if type === 'VECTOR')
    vectorNode?: VectorNode;
    
    // Image properties (if type === 'RECTANGLE' || 'ELLIPSE' with image fills)
    imageNode?: ImageNode;
    
    // Auto-layout properties (if node has layoutMode !== 'NONE')
    autoLayoutBehavior?: AutoLayoutBehavior;
    
    // Style information (for any visual node)
    styleInfo?: StyleInfo;
    
    // Sizing and positioning
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    
    // Layout constraints
    layoutAlign?: 'INHERIT' | 'STRETCH';
    layoutGrow?: number;
    layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
    layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  };
  
  // Special flags
  isNestedAutoLayout?: boolean; // True if this node has auto-layout and is nested within another auto-layout
  isComponentInstanceReference?: boolean; // True if this is a reference to another component (don't analyze deeply)
  iconContext?: 'leading' | 'trailing' | 'standalone' | 'decorative'; // Context for icons within components
}

export interface ComponentInfo {
  id: string;
  name: string;
  suggestedType: string;
  confidence: number;
  variants?: string[];
  variantDetails?: { [key: string]: string[] };
  textLayers?: string[]; // DEPRECATED: Keep for backward compatibility
  isFromLibrary: boolean;
  pageInfo?: {
    pageName: string;
    pageId: string;
    isCurrentPage: boolean;
  };
  textHierarchy?: TextHierarchy[]; // DEPRECATED: Keep for backward compatibility
  componentInstances?: ComponentInstance[]; // DEPRECATED: Keep for backward compatibility
  vectorNodes?: VectorNode[]; // DEPRECATED: Keep for backward compatibility
  imageNodes?: ImageNode[]; // DEPRECATED: Keep for backward compatibility
  styleInfo?: StyleInfo; // NEW: Color and styling information
  internalPadding?: { // NEW: Internal padding information
    paddingTop: number;
    paddingLeft: number;
    paddingRight: number;
    paddingBottom: number;
  };
  autoLayoutBehavior?: AutoLayoutBehavior; // NEW: Auto-layout behavior analysis
  
  // NEW: Hierarchical structure - this replaces flat arrays above
  componentStructure?: ComponentStructure; // Root structure with full hierarchy
}

export interface SessionState {
  fileId: string;
  fileName: string;
  lastModified: number;
  designState: {
    original: any;
    current: any;
    history: string[];
    frameId: string;
    frameName: string;
    isIterating: boolean;
  };
  scanData?: ComponentInfo[];
}

export interface SessionStorage {
  sessions: { [fileId: string]: SessionState };
  lastActiveSession?: string;
  version: string;
}

export class SessionManager {
  private static readonly STORAGE_KEY = 'aidesigner-sessions';
  private static readonly SESSION_VERSION = '1.0';
  private static readonly MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 днів

  // Зберегти поточний стан сесії
  static async saveSession(designState: any, scanData?: ComponentInfo[]): Promise<void> {
    try {
      const fileId = figma.root.id;
      const fileName = figma.root.name;
      
      // Якщо немає активної ітерації, не зберігаємо
      if (!designState.isIterating) return;
      
      console.log(`💾 Збереження сесії для файлу: ${fileName}`);
      
      const storage = await this.getSessionStorage();
      
      const session: SessionState = {
        fileId,
        fileName,
        lastModified: Date.now(),
        designState: {
          original: designState.original,
          current: designState.current,
          history: [...designState.history],
          frameId: designState.frameId,
          frameName: designState.frameId ? await this.getFrameName(designState.frameId) : '',
          isIterating: designState.isIterating
        },
        scanData
      };
      
      storage.sessions[fileId] = session;
      storage.lastActiveSession = fileId;
      
      await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
      console.log(`✅ Сесія збережена`);
      
    } catch (error) {
      console.error('❌ Помилка збереження сесії:', error);
    }
  }

  // Завантажити сесію для поточного файлу
  static async loadSession(): Promise<SessionState | null> {
    try {
      const fileId = figma.root.id;
      const storage = await this.getSessionStorage();
      
      const session = storage.sessions[fileId];
      if (!session) return null;
      
      // Перевірити, чи існує ще фрейм
      if (session.designState.frameId) {
        const frame = await figma.getNodeByIdAsync(session.designState.frameId);
        if (!frame || frame.removed) {
          console.log('⚠️ Фрейм з попередньої сесії не знайдено, очищуємо сесію');
          await this.clearSession(fileId);
          return null;
        }
      }
      
      console.log(`✅ Сесія знайдена для файлу: ${session.fileName}`);
      return session;
      
    } catch (error) {
      console.error('❌ Помилка завантаження сесії:', error);
      return null;
    }
  }

  // Отримати всі активні сесії
  static async getAllSessions(): Promise<SessionState[]> {
    try {
      const storage = await this.getSessionStorage();
      const now = Date.now();
      
      const activeSessions = Object.values(storage.sessions)
        .filter(session => (now - session.lastModified) < this.MAX_SESSION_AGE)
        .sort((a, b) => b.lastModified - a.lastModified);
      
      return activeSessions;
    } catch (error) {
      console.error('❌ Помилка завантаження всіх сесій:', error);
      return [];
    }
  }

  // Очистити сесію для файлу
  static async clearSession(fileId?: string): Promise<void> {
    try {
      const targetFileId = fileId || figma.root.id;
      const storage = await this.getSessionStorage();
      
      delete storage.sessions[targetFileId];
      
      if (storage.lastActiveSession === targetFileId) {
        delete storage.lastActiveSession;
      }
      
      await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
      console.log(`🗑️ Сесія очищена для файлу: ${targetFileId}`);
    } catch (error) {
      console.error('❌ Помилка очищення сесії:', error);
    }
  }

  // Очистити старі сесії
  static async cleanupOldSessions(): Promise<void> {
    try {
      const storage = await this.getSessionStorage();
      const now = Date.now();
      let cleaned = 0;
      
      Object.entries(storage.sessions).forEach(([fileId, session]) => {
        if ((now - session.lastModified) > this.MAX_SESSION_AGE) {
          delete storage.sessions[fileId];
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
        console.log(`🧹 Очищено ${cleaned} старих сесій`);
      }
    } catch (error) {
      console.error('❌ Помилка очищення старих сесій:', error);
    }
  }

  // Отримати storage з ініціалізацією
  private static async getSessionStorage(): Promise<SessionStorage> {
    try {
      const storage = await figma.clientStorage.getAsync(this.STORAGE_KEY);
      
      if (!storage || storage.version !== this.SESSION_VERSION) {
        return {
          sessions: {},
          version: this.SESSION_VERSION
        };
      }
      
      return storage;
    } catch (error) {
      console.error('❌ Помилка отримання storage:', error);
      return {
        sessions: {},
        version: this.SESSION_VERSION
      };
    }
  }

  // Отримати назву фрейму за ID
  private static async getFrameName(frameId: string): Promise<string> {
    try {
      const frame = await figma.getNodeByIdAsync(frameId);
      return frame?.name || 'Unknown Frame';
    } catch {
      return 'Unknown Frame';
    }
  }

  // Відновити сесію з даних
  static async restoreSessionData(sessionData: SessionState): Promise<boolean> {
    try {
      // Перевірити, чи існує фрейм
      if (sessionData.designState.frameId) {
        const frame = await figma.getNodeByIdAsync(sessionData.designState.frameId);
        if (!frame || frame.removed) {
          throw new Error('Фрейм не знайдено');
        }
        
        // Перейти до фрейму
        figma.currentPage.selection = [frame as SceneNode];
        figma.viewport.scrollAndZoomIntoView([frame as SceneNode]);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Помилка відновлення сесії:', error);
      return false;
    }
  }
}