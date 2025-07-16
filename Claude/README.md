# Instance Vibe PM - AI-Powered UI Generation System

A sophisticated AI pipeline system that transforms natural language requests into production-ready Figma UI components using a 3-stage AI processing pipeline with intelligent design system integration.

## 🎯 Project Overview

Instance Vibe PM is an advanced UI generation tool that bridges the gap between human design intent and automated UI creation. It combines artificial intelligence, design system expertise, and Figma plugin technology to generate pixel-perfect, auto-layout compatible UI components from simple text descriptions.

### Key Innovation: Rationale-Driven AI Pipeline

Unlike traditional UI generators, Instance Vibe PM features a unique **rationale system** where each AI stage documents its decision-making process, ensuring:
- **Transparency**: Understanding why specific design choices were made
- **Consistency**: Maintaining design system adherence across generations
- **Quality**: Validating that technical implementation matches design intent
- **Debugging**: Troubleshooting pipeline decisions when outputs don't meet expectations

## 🏗️ System Architecture

### Core Components

1. **3-Stage AI Pipeline** (`instance.py`)
   - **Stage 1**: User Request Analyzer - Transforms requests into structured design requirements
   - **Stage 2**: UX/UI Designer - Creates layout specifications using design system components
   - **Stage 3**: JSON Engineer - Generates production-ready Figma plugin JSON

2. **Figma Plugin** (`code.ts`, UI files)
   - Interactive interface for AI pipeline execution
   - Design system scanning and management
   - Real-time component rendering in Figma
   - Visual reference integration

3. **Design System Integration**
   - Automatic component scanning and cataloging
   - Design token extraction and application
   - Component variant management
   - Fallback system for missing design elements

### Pipeline Flow

```
User Input → Stage 1 (Analyzer) → Stage 2 (Designer) → Stage 3 (Engineer) → Figma JSON → Rendered UI
     ↓              ↓                    ↓                    ↓               ↓
Rationale      Requirements        Layout Spec         Technical         Component
Collection      Analysis           + Rationale         Implementation      Creation
```

## 🚀 Key Features

### ✅ Production-Ready Output
- **Proper Auto-Layout Structure**: Generates true Figma auto-layouts (not frames)
- **Design System Compliance**: Uses exact component IDs and variants from your design system
- **Responsive Design**: Implements proper sizing and spacing properties
- **Technical Accuracy**: Prevents common issues like width collapse and double-padding

### ✅ Intelligent Design Analysis
- **Domain Recognition**: Identifies patterns (Authentication, E-commerce, Healthcare, etc.)
- **Platform Optimization**: Adapts for Mobile vs Desktop constraints
- **User-Centered Approach**: Focuses on user needs rather than interface solutions
- **Visual Hierarchy**: Establishes proper content prominence and flow

### ✅ Advanced Design System Integration
- **Component Scanning**: Automatic detection and cataloging of design system components
- **Smart Fallbacks**: Graceful degradation when design system elements are missing
- **Color & Typography**: Automatic application of design system styles
- **Visual References**: Support for image-based design inspiration

### ✅ Developer Experience
- **Standalone Testing**: Python backend allows testing without Figma dependency
- **Comprehensive Logging**: Detailed pipeline execution tracking
- **Multiple Execution Modes**: Support for both automated and manual testing
- **Extensive Documentation**: In-depth rationale for every design decision

## 📁 Project Structure

```
instance-vibe-pm/
├── instance.py                     # Main 3-stage pipeline runner
├── code.ts                        # Figma plugin main logic
├── ui.html                        # Plugin user interface
├── manifest.json                  # Figma plugin configuration
├── package.json                   # Node.js dependencies
├── requirements.txt               # Python dependencies
├── user-request.txt               # Test input file
├── CLAUDE.md                      # Development documentation
├── src/                           # Core plugin modules
│   ├── core/                      # Engine components
│   │   ├── session-manager.ts     # State management
│   │   ├── gemini-service.ts      # AI API integration
│   │   ├── figma-renderer.ts      # Component rendering
│   │   ├── design-system-scanner-service.ts
│   │   └── validation-engine.ts   # Quality assurance
│   ├── pipeline/                  # AI pipeline orchestration
│   │   ├── orchestrator/          # Pipeline management
│   │   ├── roles/                 # AI role definitions
│   │   └── prompts/               # AI prompts and instructions
│   ├── ai/                        # AI service integration
│   │   ├── gemini-api.ts          # Google Gemini API
│   │   └── gemini-client.ts       # Client implementation
│   └── utils/                     # Utility functions
├── design-system/                 # Scanned design system data
├── python_outputs/                # Pipeline execution results
├── figma-ready/                   # Production-ready Figma JSON files
├── visual-references/             # Image references for design
├── logs/                          # Execution logging
└── Claude/                        # Documentation (this folder)
    └── README.md                  # This file
```

## 🛠️ Setup & Installation

### Prerequisites
- **Python 3.8+** for pipeline execution
- **Node.js 16+** for Figma plugin development
- **Figma Desktop App** for plugin testing
- **Google Gemini API Key** for AI processing

### Installation Steps

1. **Clone and Setup Environment**
   ```bash
   git clone [repository-url]
   cd instance-vibe-pm
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js Dependencies**
   ```bash
   npm install
   ```

4. **Configure API Access**
   Create `.env` file in project root:
   ```
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

5. **Build Figma Plugin**
   ```bash
   npm run build
   ```

## 📖 Usage Guide

### Standalone Pipeline Testing

Test the AI pipeline without Figma dependency:

```bash
# Run with custom input
python3 instance.py alt3 --input "create a mobile login screen with email and password fields"

# Run with predefined test input
python3 instance.py alt3
```

### Figma Plugin Usage

1. **Load Plugin in Figma**
   - Open Figma Desktop App
   - Go to Plugins → Development → Import plugin from manifest
   - Select `manifest.json` from project root

2. **Scan Design System**
   - Plugin automatically scans on startup
   - Or manually trigger via "Scan Design System" button
   - Results stored in `design-system/` folder

3. **Generate UI Components**
   - Enter natural language description
   - Click "Generate UI"
   - Review generated components in Figma canvas

### Testing Workflow

For rapid development iteration:

1. **Edit Test Input**: Modify `user-request.txt`
2. **Run Pipeline**: `python3 instance.py alt3`
3. **Copy JSON**: From `figma-ready/figma_ready_[timestamp].json`
4. **Test in Figma**: Paste into plugin AI Generator tab
5. **Render**: Click "Render JSON" to create components

## 🔧 Advanced Features

### Visual Reference Integration

Support for image-based design inspiration:

1. Place reference images in `visual-references/` folder
2. Reference in user requests: "create settings page based on reference image"
3. AI analyzes visual patterns and recreates using design system components

### Design Token System

Comprehensive design system integration:

- **Automatic Extraction**: Scans Figma files for colors, typography, spacing
- **Smart Application**: Applies tokens based on semantic meaning
- **Fallback Handling**: Graceful degradation for missing tokens
- **Version Management**: Tracks design system changes over time

### Pipeline Customization

Modify AI behavior through role prompts:

- **User Request Analyzer**: `src/prompts/roles/alt1-user-request-analyzer.txt`
- **UX/UI Designer**: `src/prompts/roles/alt2-ux-ui-designer.txt`
- **JSON Engineer**: `src/prompts/roles/5 json-engineer.txt`

## 📊 Output Structure

### Pipeline Results

Each pipeline execution generates:

```
python_outputs/
├── alt3_[timestamp]_1_user_request_analyzer.json
├── alt3_[timestamp]_1_user_request_analyzer_output.txt
├── alt3_[timestamp]_2_ux_ui_designer.json
├── alt3_[timestamp]_2_ux_ui_designer_output.txt
├── alt3_[timestamp]_3_json_engineer.json
├── alt3_[timestamp]_3_json_engineer_output.txt
└── figma-ready/
    └── figma_ready_[timestamp].json       # Final Figma plugin JSON
```

### Figma JSON Structure

Production-ready format ensuring proper auto-layout rendering:

```json
{
  "layoutContainer": {
    "name": "Generated Screen",
    "layoutMode": "VERTICAL",
    "itemSpacing": 16,
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "FIXED",
    "paddingTop": 24,
    "paddingRight": 16,
    "paddingBottom": 24,
    "paddingLeft": 16
  },
  "items": [
    {
      "type": "COMPONENT_INSTANCE",
      "componentId": "exact_design_system_id",
      "name": "AppBar",
      "layoutAlign": "STRETCH",
      "properties": {
        "title": "Settings"
      }
    }
    // Additional components...
  ]
}
```

## 🎨 Design System Requirements

### Component Scanning

For optimal results, ensure your design system includes:

- **Consistent Naming**: Use descriptive component names
- **Variant Properties**: Clearly defined component variants
- **Text Styles**: Named text styles for typography hierarchy
- **Color Styles**: Semantic color naming (Primary, Secondary, Error, etc.)
- **Proper Organization**: Group related components logically

### Supported Component Types

- Navigation (AppBar, TabBar, BottomNavigation)
- Form Elements (TextInput, Button, Checkbox, Switch)
- Content Display (Card, ListItem, Avatar, Badge)
- Layout (Container, Spacer, Divider)
- Feedback (Alert, Toast, ProgressBar)

## 🚨 Troubleshooting

### Common Issues

1. **Width Collapse (1px components)**
   - Ensure text elements have `horizontalSizing: "FILL"`
   - Use `layoutAlign: "STRETCH"` for full-width layouts

2. **Missing Design System Components**
   - Run design system scan: Check plugin scan results
   - Verify component naming consistency
   - Review `design-system-raw-data-[timestamp].json`

3. **API Key Issues**
   - Verify `.env` file configuration
   - Check Gemini API key validity
   - Ensure network access to Google APIs

4. **Build Errors**
   - Run `npm install` to update dependencies
   - Check TypeScript compilation: `npm run build`
   - Review console for specific error messages

### Debug Mode

Enable detailed logging:

```bash
# Python pipeline with verbose output
python3 instance.py alt3 --debug

# Check plugin console in Figma
# Developer Console → Plugins → [Plugin Name]
```

## 🔄 Development Workflow

### Testing Branch

The project maintains a specialized testing branch:

```bash
# Switch to simplified testing interface
git checkout create-test-UI

# Run test pipeline
python3 instance.py alt3

# Return to main development
git checkout main
```

### Contribution Guidelines

1. **Code Style**: Follow existing TypeScript/Python conventions
2. **Testing**: Test changes in both standalone and plugin modes
3. **Documentation**: Update relevant documentation for new features
4. **Rationale**: Ensure AI pipeline changes include proper rationale documentation

## 📈 Performance Metrics

### Pipeline Execution Times

- **Stage 1 (Analyzer)**: ~2-4 seconds
- **Stage 2 (Designer)**: ~3-6 seconds  
- **Stage 3 (Engineer)**: ~2-5 seconds
- **Total Pipeline**: ~7-15 seconds

### Design System Scanning

- **Small System** (10-50 components): ~5-10 seconds
- **Medium System** (50-200 components): ~15-30 seconds
- **Large System** (200+ components): ~30-60 seconds

## 🌟 Future Roadmap

### Planned Features

- **Multi-language Support**: Expand beyond English input
- **Advanced Layout Types**: Grid systems, masonry layouts
- **Animation Integration**: Motion design specifications
- **Collaboration Features**: Team-based design system management
- **Plugin Marketplace**: Figma Community plugin distribution

### Research Areas

- **Context-Aware Generation**: Learning from user design patterns
- **Advanced Visual Understanding**: Computer vision for layout analysis
- **Design System Evolution**: Automated component optimization
- **Cross-Platform Output**: React Native, Flutter component generation

## 📚 Additional Resources

### Documentation Files

- `CLAUDE.md` - Development setup and testing procedures
- `docs/Plugin_Architecture_and_Logic.md` - Technical architecture details
- `AI_PIPELINE_TEST_RESULTS.md` - Pipeline performance analysis

### Example Outputs

- `python_outputs/` - Historical pipeline execution results
- `figma-ready/figma_ready_*.json` - Ready-to-use Figma plugin JSON files
- `rationale_*.txt` - AI decision rationale documentation

---

**Instance Vibe PM** represents the next generation of AI-powered design tools, combining the creativity of human designers with the precision of automated systems to create beautiful, functional user interfaces at scale.