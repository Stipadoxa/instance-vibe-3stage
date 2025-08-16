# UXPal Project Workflow Schema

## 📋 **Overview**
UXPal is a Figma plugin that transforms user requests into complete UI layouts using AI-powered design automation and existing design system components.

---

## 🔄 **Complete Workflow Architecture**

### **Current Semi-Automated Pipeline** ✅ **(ACTIVE)**
```
[user-request.txt] → [Python AI Pipeline] → [Manual Copy] → [Figma Plugin] → [Live Rendering]
        ↓                     ↓                   ↓              ↓              ↓
   Hardcoded Test         3-Stage AI         JSON Transfer    AI Generator    Component
    Prompts              Processing         (Copy/Paste)        Tab          Creation
```

### **Target Fully-Automated Pipeline** 🔄 **(IN DEVELOPMENT)**
```
[User Input] → [AI Pipeline] → [Design System Scan] → [JSON Generation] → [Figma Rendering]
     ↓              ↓                    ↓                    ↓                 ↓
   Plugin UI     Real-time AI        Component         Structured         Live UI
   Text Input     Processing           Scanning           JSON Data        Components
```

---

## 🎯 **Phase 1: User Input & Analysis**

### **Entry Points**

#### **A. Figma Plugin Interface**
- **File**: `ui.html` - Main plugin UI with tabbed interface
- **Features**: 
  - Design System Scanner tab
  - AI Generator tab with text input
  - Settings and API configuration
- **User Action**: Enter design request in natural language

#### **B. Python Testing Interface** 
- **File**: `instance.py` - Standalone pipeline runner
- **Usage**: `python instance.py alt3` (runs 3-stage pipeline)
- **Features**:
  - Loads hardcoded prompts from `user-request.txt`
  - Outputs to `python_outputs/` folder
  - Supports stage-by-stage execution

---

## 🧠 **Phase 2: AI Processing Pipeline**

### **3-Stage AI Pipeline** (`instance.py`)

#### **Stage 1: User Request Analysis**
- **Prompt File**: `src/prompts/roles/alt1-user-request-analyzer.txt`
- **Purpose**: Transform user request into structured requirements
- **Process**:
  - Classify as "Brief Idea" vs "Detailed Specification"
  - Extract domain context (Authentication, E-commerce, etc.)
  - Identify content requirements and constraints
- **Output**: Structured analysis with user goals and technical requirements

#### **Stage 2: UX/UI Design**
- **Prompt File**: `src/prompts/roles/alt2-ux-ui-designer.txt`
- **Purpose**: Create design specifications using available components
- **Process**:
  - Receives design system data as `DESIGN_SYSTEM_DATA`
  - Maps requirements to available components
  - Selects optimal variants for each component
  - Documents design rationale and component choices
- **Output**: Detailed component selection with variants and content

#### **Stage 3: JSON Engineering**
- **Prompt File**: `src/prompts/roles/5 json-engineer.txt`
- **Purpose**: Convert design specs to Figma-renderable JSON
- **Process**:
  - Transform design specifications into structured JSON
  - Apply layout rules (auto-layout, spacing, sizing)
  - Ensure component ID accuracy and variant compliance
- **Output**: Production-ready JSON for Figma rendering

### **Advanced Pipeline Extensions**

#### **Stage 4: Visual Feedback (Optional)**
- **Script**: `auto_stage4.py`, `trigger_stage4.py`
- **Purpose**: Screenshot-based visual improvement analysis
- **Process**:
  - Takes screenshot of rendered UI
  - Analyzes visual quality and suggests improvements
  - Generates refined design recommendations

#### **Stage 5: Visual Enhancement (Optional)**
- **Script**: `run_stage5.py`  
- **Prompt File**: `src/prompts/roles/visual-improvement-analyzer-ui.txt`
- **Purpose**: Apply visual improvements based on Stage 4 analysis
- **Output**: Enhanced JSON with improved visual hierarchy

---

## 🔍 **Phase 3: Design System Scanning**

### **Component Discovery**
- **Main Service**: `src/core/design-system-scanner-service.ts`
- **Scanner Engine**: `src/core/component-scanner.ts`
- **Process**:
  1. Scan all pages in current Figma file
  2. Find `COMPONENT_SET` and `COMPONENT` nodes
  3. Analyze component variants, properties, and text layers
  4. Extract color styles and text styles
  5. Generate component schemas with available options

### **Component Analysis**
- **Property Engine**: `src/core/component-property-engine.ts`
- **Capabilities**:
  - Validates component properties against schemas
  - Handles component-specific requirements (Tab, Chip, etc.)
  - Manages variant combinations and text layer mapping
  - Provides fallback strategies for missing components

### **Data Storage**
- **Session Manager**: `src/core/session-manager.ts`
- **Cache Location**: `design-system/design-system-raw-data-*.json`
- **Auto-Loading**: Plugin automatically scans on startup if needed

---

## 🎨 **Phase 4: JSON Processing & Validation**

### **JSON Migration & Validation**
- **Migrator**: `src/core/json-migrator.ts`
- **Validator**: `src/core/validation-engine.ts`
- **Process**:
  - Validates JSON structure against design system schemas
  - Migrates older JSON formats to current standards
  - Ensures component IDs exist and variants are valid
  - Handles property mapping and fallback scenarios

---

## 🖼️ **Phase 5: Figma Rendering**

### **Main Renderer**
- **File**: `src/core/figma-renderer.ts`
- **Methods**:
  - `generateUIFromDataSystematic()` - Main rendering pipeline
  - `createComponentInstanceSystematic()` - Component instantiation
  - `applyVariantsSystematic()` - Variant application
  - `createTextNode()`, `createRectangleNode()`, `createEllipseNode()` - Native elements

### **Rendering Process**
1. **Layout Creation**: Create main container with auto-layout
2. **Component Resolution**: Match JSON component IDs to Figma components
3. **Instance Creation**: Instantiate components from main components
4. **Variant Application**: Apply specified variants using Component Properties API
5. **Property Setting**: Set text content, media, and other properties
6. **Native Fallback**: Create native nodes for unsupported elements

### **Supported Element Types**
- **Components**: All scanned design system components with variants
- **Native Elements**: 
  - `native-text` - Custom text with styling
  - `native-rectangle` - Basic shapes with fills
  - `native-circle` - Ellipse/circle elements

---

## 📁 **File Organization**

### **Core System Files**
```
├── code.ts                    # Main Figma plugin entry point
├── ui.html                    # Plugin user interface
├── instance.py                # Standalone Python pipeline runner
├── user-request.txt           # Hardcoded test prompts
└── CLAUDE.md                  # Project documentation and testing guide
```

### **AI Prompt Files**
```
src/prompts/roles/
├── alt1-user-request-analyzer.txt      # Stage 1: Request analysis
├── alt2-ux-ui-designer.txt            # Stage 2: UX/UI design
├── 5 json-engineer.txt                # Stage 3: JSON generation
├── visual-improvement-analyzer-ui.txt  # Stage 5: Visual enhancement
└── json-engineer-ui.txt               # Alternative JSON engineering
```

### **Core Engine Files**
```
src/core/
├── component-scanner.ts                # Design system scanning
├── design-system-scanner-service.ts   # Scanning orchestration
├── component-property-engine.ts        # Component validation
├── figma-renderer.ts                  # UI rendering engine
├── validation-engine.ts               # JSON validation
├── json-migrator.ts                   # Format migration
└── session-manager.ts                 # State management
```

### **Pipeline Support Scripts**
```
├── auto_stage4.py            # Automated visual feedback
├── trigger_stage4.py         # Stage 4 triggering
├── run_stage5.py            # Visual enhancement execution
├── manual_stage4_test.py     # Manual stage 4 testing
└── manual_stage5_test.py     # Manual stage 5 testing
```

---

## ⚡ **Key Workflow Patterns**

### **Current Semi-Automated Workflow** (Primary Development Method)
**Status**: ✅ **WORKING** - This is the main workflow currently in use

1. **Design System Scan**: 
   - Figma plugin automatically scans design system on startup
   - Creates `design-system-raw-data-*.json` files in `design-system/` folder
   - Data includes all available components, variants, and properties

2. **Python Pipeline Execution**:
   - **Edit**: Modify `user-request.txt` with desired UI request
   - **Run**: `python3 instance.py alt3` (executes 3-stage AI pipeline)
   - **Output**: Generates timestamped JSON in `figma-ready/figma_ready_TIMESTAMP.json`

3. **Manual JSON Transfer**:
   - **Copy**: JSON content from generated output file
   - **Paste**: Into Figma plugin's AI Generator tab
   - **Render**: Click RENDER button to create live UI components

4. **Iteration & Debugging**:
   - Check Figma developer console for rendering logs
   - Modify `user-request.txt` and repeat for refinements
   - Use comprehensive debug logging for troubleshooting

**Key Benefits**: 
- Consistent testing with hardcoded prompts
- Full control over each pipeline stage
- Easy debugging and iteration
- Reliable output generation

### **Fully Automated Workflow** (Future/Testing)
**Status**: 🔄 **IN DEVELOPMENT** - Plugin-native AI processing

1. **Design System Scan**: Automatic on plugin startup
2. **User Input**: Natural language request in plugin UI
3. **AI Processing**: Real-time 3-stage pipeline within plugin
4. **Live Rendering**: Immediate Figma component creation
5. **Iteration**: Refine request and re-render directly in plugin

**Current Limitations**: 
- Requires API key configuration in plugin
- Less debugging visibility than Python approach
- Pipeline execution within Figma environment constraints

### **Testing Branches**
- **Main Branch**: Full production features with auto-scan
- **`create-test-UI` Branch**: Simplified testing interface
- **Testing Setup**: Preserved for rapid development iteration

---

## 🔧 **Technical Integration Points**

### **Build System**
- **Compilation**: `npm run build` (TypeScript → JavaScript)
- **Main Files**: `code.js`, `ui-bundle.js` (compiled outputs)
- **Development**: Always modify `.ts` files, never `.js` directly

### **API Integration**
- **Google Gemini**: For AI processing stages
- **Figma Plugin API**: For component scanning and rendering
- **Component Properties API**: For modern variant handling

### **Data Flow**
```
User Request → AI Analysis → Component Matching → JSON Structure → Figma Rendering
     ↓              ↓              ↓               ↓              ↓
   Natural      Structured    Component IDs    Layout JSON    Live UI
   Language     Requirements   & Variants      & Properties   Components
```

---

## 🎯 **Success Metrics**

### **Pipeline Success Indicators**
- ✅ All 3 AI stages complete without errors
- ✅ Component IDs successfully resolve to real Figma components  
- ✅ Variants apply correctly to component instances
- ✅ Layout renders with proper auto-layout and spacing
- ✅ Text content populates in designated text layers

### **Quality Indicators**
- ✅ Design system compliance (uses existing components)
- ✅ Visual hierarchy matches user intent
- ✅ Responsive layout behavior
- ✅ Consistent spacing and typography
- ✅ Proper variant selection for user requirements

---

**Status**: Complete functional pipeline with comprehensive testing framework and visual feedback capabilities.  
**Last Updated**: July 30, 2025  
**Current Branch**: `main` with variant application fixes applied