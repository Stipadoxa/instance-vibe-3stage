"use strict";
// component-scanner.ts
// Design system component scanning and analysis for AIDesigner
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentScanner = void 0;
var ComponentScanner = /** @class */ (function () {
    function ComponentScanner() {
    }
    /**
     * NEW: Scan Figma Variables (Design Tokens) from the local file
     */
    ComponentScanner.scanFigmaVariables = function () {
        return __awaiter(this, void 0, void 0, function () {
            var collections, tokens, _i, collections_1, collection, variables, _a, variables_1, variable, modes, firstMode, value, token, collectionError_1, colorTokens, otherTokens, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("🔧 Scanning Figma Variables (Design Tokens)...");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, , 10]);
                        // Debug: Check if Variables API exists
                        if (!figma.variables) {
                            console.warn("❌ figma.variables API not available in this Figma version");
                            return [2 /*return*/, []];
                        }
                        console.log("✅ figma.variables API is available");
                        return [4 /*yield*/, figma.variables.getLocalVariableCollectionsAsync()];
                    case 2:
                        collections = _b.sent();
                        console.log("\u2705 Found ".concat(collections.length, " variable collections"));
                        // Debug: Check if we have any collections at all
                        if (collections.length === 0) {
                            console.warn("⚠️ No variable collections found. Possible reasons:");
                            console.warn("  1. File has no Variables/Design Tokens defined");
                            console.warn("  2. Variables are in a different library/file");
                            console.warn("  3. Variables API permissions issue");
                            // Try to get ALL variables (not just local)
                            try {
                                console.log("🔍 Checking for non-local variables...");
                                // Note: This might not be available, but worth trying
                            }
                            catch (e) {
                                console.log("📝 Non-local variable check not available");
                            }
                            return [2 /*return*/, []];
                        }
                        tokens = [];
                        _i = 0, collections_1 = collections;
                        _b.label = 3;
                    case 3:
                        if (!(_i < collections_1.length)) return [3 /*break*/, 8];
                        collection = collections_1[_i];
                        console.log("\uD83D\uDCE6 Processing collection: \"".concat(collection.name, "\" (ID: ").concat(collection.id, ")"));
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, figma.variables.getVariablesByCollectionAsync(collection.id)];
                    case 5:
                        variables = _b.sent();
                        console.log("  Found ".concat(variables.length, " variables in \"").concat(collection.name, "\""));
                        // Debug: Log collection details
                        console.log("  Collection modes:", Object.keys(collection.modes || {}));
                        for (_a = 0, variables_1 = variables; _a < variables_1.length; _a++) {
                            variable = variables_1[_a];
                            try {
                                console.log("    Processing variable: \"".concat(variable.name, "\" (Type: ").concat(variable.resolvedType, ")"));
                                modes = Object.keys(variable.valuesByMode);
                                console.log("      Available modes: [".concat(modes.join(', '), "]"));
                                if (modes.length === 0) {
                                    console.warn("      \u26A0\uFE0F Variable \"".concat(variable.name, "\" has no modes"));
                                    continue;
                                }
                                firstMode = modes[0];
                                value = variable.valuesByMode[firstMode];
                                console.log("      Using mode \"".concat(firstMode, "\" with value:"), value);
                                token = {
                                    id: variable.id,
                                    name: variable.name,
                                    type: variable.resolvedType,
                                    value: value,
                                    collection: collection.name,
                                    mode: firstMode,
                                    description: variable.description || undefined
                                };
                                tokens.push(token);
                                if (variable.resolvedType === 'COLOR') {
                                    console.log("\uD83C\uDFA8 Color token: \"".concat(variable.name, "\" = ").concat(JSON.stringify(value)));
                                }
                                else {
                                    console.log("\uD83D\uDD27 ".concat(variable.resolvedType, " token: \"").concat(variable.name, "\""));
                                }
                            }
                            catch (varError) {
                                console.warn("\u26A0\uFE0F Failed to process variable \"".concat(variable.name, "\":"), varError);
                            }
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        collectionError_1 = _b.sent();
                        console.warn("\u26A0\uFE0F Failed to process collection \"".concat(collection.name, "\":"), collectionError_1);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8:
                        colorTokens = tokens.filter(function (t) { return t.type === 'COLOR'; });
                        otherTokens = tokens.filter(function (t) { return t.type !== 'COLOR'; });
                        console.log("\uD83D\uDD27 Design Tokens Summary:");
                        console.log("   Color Tokens: ".concat(colorTokens.length));
                        console.log("   Other Tokens: ".concat(otherTokens.length));
                        console.log("   Total: ".concat(tokens.length, " tokens"));
                        if (tokens.length === 0) {
                            console.log("🤔 Debug suggestions:");
                            console.log("  1. Check if this file has Variables in the right panel");
                            console.log("  2. Try creating a simple color variable as a test");
                            console.log("  3. Check if Variables are published from a library");
                        }
                        return [2 /*return*/, tokens];
                    case 9:
                        error_1 = _b.sent();
                        console.warn("⚠️ Failed to scan design tokens:", error_1);
                        console.warn("  This could be due to:");
                        console.warn("  - Variables API not available in this Figma version");
                        console.warn("  - Plugin permissions");
                        console.warn("  - File access restrictions");
                        return [2 /*return*/, []];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * NEW: Fallback - Create design tokens from color styles for testing
     * This allows testing the token system even when Variables API doesn't work
     */
    ComponentScanner.createDesignTokensFromColorStyles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var colorStyleCollection, tokens_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("🔄 Creating fallback design tokens from color styles...");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.scanFigmaColorStyles()];
                    case 2:
                        colorStyleCollection = _a.sent();
                        tokens_1 = [];
                        // Convert each color style to a design token format
                        Object.entries(colorStyleCollection).forEach(function (_a) {
                            var category = _a[0], styles = _a[1];
                            styles.forEach(function (style) {
                                // Create a token name from the style name
                                var tokenName = style.name.toLowerCase()
                                    .replace(/[\/\s]+/g, '-') // Replace / and spaces with -
                                    .replace(/[^a-z0-9\-]/g, ''); // Remove special chars
                                // Convert hex color to RGB format for consistency with Variables API
                                var rgbValue = { r: 0, g: 0, b: 0 };
                                if (style.colorInfo.type === 'SOLID' && style.colorInfo.color) {
                                    var hex = style.colorInfo.color.replace('#', '');
                                    rgbValue = {
                                        r: parseInt(hex.substr(0, 2), 16) / 255,
                                        g: parseInt(hex.substr(2, 2), 16) / 255,
                                        b: parseInt(hex.substr(4, 2), 16) / 255
                                    };
                                }
                                var token = {
                                    id: "fallback-".concat(style.id),
                                    name: tokenName,
                                    type: 'COLOR',
                                    value: rgbValue,
                                    collection: "".concat(category, "-colors"),
                                    mode: 'default',
                                    description: "Fallback token from color style: ".concat(style.name)
                                };
                                tokens_1.push(token);
                                console.log("\uD83C\uDFA8 Created fallback token: \"".concat(tokenName, "\" from \"").concat(style.name, "\""));
                            });
                        });
                        console.log("\uD83D\uDD04 Created ".concat(tokens_1.length, " fallback design tokens from color styles"));
                        return [2 /*return*/, tokens_1];
                    case 3:
                        error_2 = _a.sent();
                        console.warn("⚠️ Failed to create fallback design tokens:", error_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Scan Figma Color Styles from the local file
     */
    ComponentScanner.scanFigmaColorStyles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var paintStyles, colorStyleCollection, _i, paintStyles_1, paintStyle, colorStyle, category, error_3, totalStyles, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("🎨 Scanning Figma Color Styles...");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, figma.getLocalPaintStylesAsync()];
                    case 2:
                        paintStyles = _a.sent();
                        console.log("\u2705 Found ".concat(paintStyles.length, " paint styles"));
                        colorStyleCollection = {
                            primary: [],
                            secondary: [],
                            tertiary: [],
                            neutral: [],
                            semantic: [],
                            surface: [],
                            other: []
                        };
                        _i = 0, paintStyles_1 = paintStyles;
                        _a.label = 3;
                    case 3:
                        if (!(_i < paintStyles_1.length)) return [3 /*break*/, 8];
                        paintStyle = paintStyles_1[_i];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.convertPaintStyleToColorStyle(paintStyle)];
                    case 5:
                        colorStyle = _a.sent();
                        category = this.categorizeColorStyle(colorStyle.name);
                        colorStyleCollection[category].push(colorStyle);
                        console.log("\uD83C\uDFA8 Categorized \"".concat(colorStyle.name, "\" as ").concat(category, " (variant: ").concat(colorStyle.variant || 'none', ")"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_3 = _a.sent();
                        console.warn("\u26A0\uFE0F Failed to process paint style \"".concat(paintStyle.name, "\":"), error_3);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8:
                        totalStyles = Object.values(colorStyleCollection).reduce(function (sum, styles) { return sum + styles.length; }, 0);
                        console.log("\uD83C\uDFA8 Color Styles Summary:");
                        console.log("   Primary: ".concat(colorStyleCollection.primary.length));
                        console.log("   Secondary: ".concat(colorStyleCollection.secondary.length));
                        console.log("   Tertiary: ".concat(colorStyleCollection.tertiary.length));
                        console.log("   Neutral: ".concat(colorStyleCollection.neutral.length));
                        console.log("   Semantic: ".concat(colorStyleCollection.semantic.length));
                        console.log("   Surface: ".concat(colorStyleCollection.surface.length));
                        console.log("   Other: ".concat(colorStyleCollection.other.length));
                        console.log("   Total: ".concat(totalStyles, " styles"));
                        return [2 /*return*/, colorStyleCollection];
                    case 9:
                        error_4 = _a.sent();
                        console.error("❌ Failed to scan color styles:", error_4);
                        return [2 /*return*/, {
                                primary: [],
                                secondary: [],
                                tertiary: [],
                                neutral: [],
                                semantic: [],
                                surface: [],
                                other: []
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Scans all local text styles in the current Figma file
     * Mirrors the scanFigmaColorStyles pattern exactly
     */
    ComponentScanner.scanFigmaTextStyles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var figmaTextStyles, textStyles, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('🔍 Scanning text styles...');
                        return [4 /*yield*/, figma.getLocalTextStylesAsync()];
                    case 1:
                        figmaTextStyles = _a.sent();
                        console.log("Found ".concat(figmaTextStyles.length, " text styles"));
                        textStyles = figmaTextStyles.map(function (style) {
                            // Build text style object with safe property access
                            var textStyle = {
                                id: style.id,
                                name: style.name,
                                description: style.description || '',
                                fontSize: style.fontSize,
                                fontName: style.fontName,
                                lineHeight: style.lineHeight,
                                letterSpacing: style.letterSpacing,
                            };
                            // Add optional properties if they exist
                            if (style.textDecoration) {
                                textStyle.textDecoration = style.textDecoration;
                            }
                            if (style.textCase) {
                                textStyle.textCase = style.textCase;
                            }
                            if (style.textAlignHorizontal) {
                                textStyle.textAlignHorizontal = style.textAlignHorizontal;
                            }
                            if (style.textAlignVertical) {
                                textStyle.textAlignVertical = style.textAlignVertical;
                            }
                            if (style.paragraphSpacing !== undefined) {
                                textStyle.paragraphSpacing = style.paragraphSpacing;
                            }
                            if (style.paragraphIndent !== undefined) {
                                textStyle.paragraphIndent = style.paragraphIndent;
                            }
                            console.log("\u2705 Processed text style: ".concat(style.name, " (").concat(style.fontSize, "px)"));
                            return textStyle;
                        });
                        console.log("\uD83D\uDCDD Successfully scanned ".concat(textStyles.length, " text styles"));
                        return [2 /*return*/, textStyles];
                    case 2:
                        error_5 = _a.sent();
                        console.error('❌ Error scanning text styles:', error_5);
                        throw new Error("Failed to scan text styles: ".concat(error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Convert Figma PaintStyle to our ColorStyle interface
     */
    ComponentScanner.convertPaintStyleToColorStyle = function (paintStyle) {
        return __awaiter(this, void 0, void 0, function () {
            var colorInfo, _a, category, variant;
            return __generator(this, function (_b) {
                colorInfo = this.convertPaintToColorInfo(paintStyle.paints[0]);
                _a = this.parseColorStyleName(paintStyle.name), category = _a.category, variant = _a.variant;
                return [2 /*return*/, {
                        id: paintStyle.id,
                        name: paintStyle.name,
                        description: paintStyle.description || undefined,
                        paints: paintStyle.paints,
                        category: category,
                        variant: variant,
                        colorInfo: colorInfo || { type: 'SOLID', color: '#000000', opacity: 1 }
                    }];
            });
        });
    };
    /**
     * Categorize a color style based on its name
     * Supports patterns like: 'primary90', 'secondary50', 'neutral-100', 'Primary/500', etc.
     */
    ComponentScanner.categorizeColorStyle = function (styleName) {
        var name = styleName.toLowerCase();
        // Primary patterns
        if (name.includes('primary') || name.includes('brand')) {
            return 'primary';
        }
        // Secondary patterns
        if (name.includes('secondary') || name.includes('accent')) {
            return 'secondary';
        }
        // Tertiary patterns
        if (name.includes('tertiary')) {
            return 'tertiary';
        }
        // Neutral patterns (grays, blacks, whites)
        if (name.includes('neutral') || name.includes('gray') || name.includes('grey') ||
            name.includes('black') || name.includes('white') || name.includes('slate')) {
            return 'neutral';
        }
        // Semantic patterns (success, error, warning, info)
        if (name.includes('success') || name.includes('error') || name.includes('warning') ||
            name.includes('info') || name.includes('danger') || name.includes('alert') ||
            name.includes('green') || name.includes('red') || name.includes('yellow') ||
            name.includes('blue') || name.includes('orange')) {
            return 'semantic';
        }
        // Surface patterns (background, surface, container)
        if (name.includes('surface') || name.includes('background') || name.includes('container') ||
            name.includes('backdrop') || name.includes('overlay')) {
            return 'surface';
        }
        // Default to other
        return 'other';
    };
    /**
     * Parse color style name to extract category and variant
     * Examples: 'primary90' -> { category: 'primary', variant: '90' }
     *          'Primary/500' -> { category: 'primary', variant: '500' }
     *          'neutral-100' -> { category: 'neutral', variant: '100' }
     */
    ComponentScanner.parseColorStyleName = function (styleName) {
        var name = styleName.toLowerCase();
        // Pattern 1: name + number (e.g., 'primary90', 'secondary50')
        var pattern1 = name.match(/^(primary|secondary|tertiary|neutral|semantic|surface|brand|accent|gray|grey|success|error|warning|info|danger|green|red|yellow|blue|orange)(\d+)$/);
        if (pattern1) {
            var colorName = pattern1[1], variant = pattern1[2];
            return {
                category: this.categorizeColorStyle(colorName),
                variant: variant
            };
        }
        // Pattern 2: name/number or name-number (e.g., 'Primary/500', 'neutral-100')
        var pattern2 = name.match(/^([^\/\-\d]+)[\/-](\d+)$/);
        if (pattern2) {
            var colorName = pattern2[1], variant = pattern2[2];
            return {
                category: this.categorizeColorStyle(colorName),
                variant: variant
            };
        }
        // Pattern 3: just category name
        return {
            category: this.categorizeColorStyle(name),
            variant: undefined
        };
    };
    /**
     * Main scanning function - scans all pages for components and color styles
     */
    ComponentScanner.scanDesignSystem = function () {
        return __awaiter(this, void 0, void 0, function () {
            var components, colorStyles, textStyles, designTokens, error_6, fallbackError_1, error_7, error_8, _i, _a, page, allNodes, _b, allNodes_1, node, componentInfo, e_1, e_2, scanSession, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("🔍 Starting comprehensive design system scan...");
                        components = [];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 34, , 35]);
                        return [4 /*yield*/, figma.loadAllPagesAsync()];
                    case 2:
                        _c.sent();
                        console.log("✅ All pages loaded");
                        // First, scan Design Tokens (Variables)
                        console.log("\n🔧 Phase 1: Scanning Design Tokens...");
                        designTokens = void 0;
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 8, , 13]);
                        return [4 /*yield*/, this.scanFigmaVariables()];
                    case 4:
                        designTokens = _c.sent();
                        // Debug: Log what we got from Variables API
                        console.log("\uD83D\uDD0D Variables API returned:", designTokens);
                        console.log("\uD83D\uDD0D Type: ".concat(typeof designTokens, ", Length: ").concat(designTokens ? designTokens.length : 'undefined'));
                        if (!(!designTokens || designTokens.length === 0)) return [3 /*break*/, 6];
                        console.log("🔄 No Variables found, trying fallback design tokens from color styles...");
                        return [4 /*yield*/, this.createDesignTokensFromColorStyles()];
                    case 5:
                        designTokens = _c.sent();
                        if (designTokens && designTokens.length > 0) {
                            console.log("✅ Using fallback design tokens created from color styles");
                        }
                        else {
                            console.log("⚠️ Fallback also returned no tokens");
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        console.log("✅ Using Variables API design tokens");
                        _c.label = 7;
                    case 7: return [3 /*break*/, 13];
                    case 8:
                        error_6 = _c.sent();
                        console.warn("⚠️ Design Tokens scanning failed, trying fallback:", error_6);
                        _c.label = 9;
                    case 9:
                        _c.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, this.createDesignTokensFromColorStyles()];
                    case 10:
                        designTokens = _c.sent();
                        console.log("✅ Using fallback design tokens despite Variables API error");
                        return [3 /*break*/, 12];
                    case 11:
                        fallbackError_1 = _c.sent();
                        console.warn("⚠️ Fallback design tokens also failed:", fallbackError_1);
                        designTokens = undefined;
                        return [3 /*break*/, 12];
                    case 12: return [3 /*break*/, 13];
                    case 13:
                        // Second, scan Color Styles
                        console.log("\n🎨 Phase 2: Scanning Color Styles...");
                        _c.label = 14;
                    case 14:
                        _c.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, this.scanFigmaColorStyles()];
                    case 15:
                        colorStyles = _c.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        error_7 = _c.sent();
                        console.warn("⚠️ Color Styles scanning failed, continuing without color styles:", error_7);
                        colorStyles = undefined;
                        return [3 /*break*/, 17];
                    case 17:
                        // Third, scan Text Styles
                        console.log("\n📝 Phase 3: Scanning Text Styles...");
                        _c.label = 18;
                    case 18:
                        _c.trys.push([18, 20, , 21]);
                        return [4 /*yield*/, this.scanFigmaTextStyles()];
                    case 19:
                        textStyles = _c.sent();
                        return [3 /*break*/, 21];
                    case 20:
                        error_8 = _c.sent();
                        console.warn("⚠️ Text Styles scanning failed, continuing without text styles:", error_8);
                        textStyles = undefined;
                        return [3 /*break*/, 21];
                    case 21:
                        // Fourth, scan components
                        console.log("\n🧩 Phase 4: Scanning Components...");
                        _i = 0, _a = figma.root.children;
                        _c.label = 22;
                    case 22:
                        if (!(_i < _a.length)) return [3 /*break*/, 33];
                        page = _a[_i];
                        console.log("\uD83D\uDCCB Scanning page: \"".concat(page.name, "\""));
                        _c.label = 23;
                    case 23:
                        _c.trys.push([23, 31, , 32]);
                        allNodes = page.findAll(function (node) {
                            if (node.type === 'COMPONENT_SET') {
                                return true;
                            }
                            if (node.type === 'COMPONENT') {
                                return !!(node.parent && node.parent.type !== 'COMPONENT_SET');
                            }
                            return false;
                        });
                        console.log("\u2705 Found ".concat(allNodes.length, " main components on page \"").concat(page.name, "\""));
                        _b = 0, allNodes_1 = allNodes;
                        _c.label = 24;
                    case 24:
                        if (!(_b < allNodes_1.length)) return [3 /*break*/, 30];
                        node = allNodes_1[_b];
                        _c.label = 25;
                    case 25:
                        _c.trys.push([25, 28, , 29]);
                        if (!(node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')) return [3 /*break*/, 27];
                        return [4 /*yield*/, this.analyzeComponent(node)];
                    case 26:
                        componentInfo = _c.sent();
                        if (componentInfo) {
                            componentInfo.pageInfo = {
                                pageName: page.name,
                                pageId: page.id,
                                isCurrentPage: page.id === figma.currentPage.id
                            };
                            components.push(componentInfo);
                        }
                        _c.label = 27;
                    case 27: return [3 /*break*/, 29];
                    case 28:
                        e_1 = _c.sent();
                        console.error("\u274C Error analyzing component \"".concat(node.name, "\":"), e_1);
                        return [3 /*break*/, 29];
                    case 29:
                        _b++;
                        return [3 /*break*/, 24];
                    case 30: return [3 /*break*/, 32];
                    case 31:
                        e_2 = _c.sent();
                        console.error("\u274C Error scanning page \"".concat(page.name, "\":"), e_2);
                        return [3 /*break*/, 32];
                    case 32:
                        _i++;
                        return [3 /*break*/, 22];
                    case 33:
                        scanSession = {
                            components: components,
                            colorStyles: colorStyles,
                            textStyles: textStyles,
                            designTokens: designTokens, // NEW: Include design tokens
                            scanTime: Date.now(),
                            version: "2.1.0", // Bump version for token support
                            fileKey: figma.fileKey || undefined
                        };
                        console.log("\n\uD83C\uDF89 Comprehensive scan complete!");
                        console.log("   \uD83D\uDCE6 Components: ".concat(components.length));
                        console.log("   \uD83D\uDD27 Design Tokens: ".concat(designTokens ? designTokens.length : 0));
                        console.log("   \uD83C\uDFA8 Color Styles: ".concat(colorStyles ? Object.values(colorStyles).reduce(function (sum, styles) { return sum + styles.length; }, 0) : 0));
                        console.log("   \uD83D\uDCDD Text Styles: ".concat(textStyles ? textStyles.length : 0));
                        console.log("   \uD83D\uDCC4 File Key: ".concat(scanSession.fileKey || 'Unknown'));
                        return [2 /*return*/, scanSession];
                    case 34:
                        e_3 = _c.sent();
                        console.error("❌ Critical error in scanDesignSystem:", e_3);
                        throw e_3;
                    case 35: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Legacy method for backward compatibility - returns only components
     */
    ComponentScanner.scanComponents = function () {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.scanDesignSystem()];
                    case 1:
                        session = _a.sent();
                        return [2 /*return*/, session.components];
                }
            });
        });
    };
    /**
     * Recursively searches for auto-layout containers with padding to find visual padding
     */
    ComponentScanner.findNestedAutolayoutPadding = function (node, depth) {
        if (depth === void 0) { depth = 0; }
        // Limit recursion depth to prevent infinite loops
        if (depth > 3)
            return null;
        try {
            // Check if current node has auto-layout with meaningful padding
            if (node.layoutMode && node.layoutMode !== 'NONE') {
                var padding = {
                    paddingTop: node.paddingTop || 0,
                    paddingLeft: node.paddingLeft || 0,
                    paddingRight: node.paddingRight || 0,
                    paddingBottom: node.paddingBottom || 0
                };
                // If this auto-layout has meaningful padding, return it
                if (padding.paddingTop > 0 || padding.paddingLeft > 0 ||
                    padding.paddingRight > 0 || padding.paddingBottom > 0) {
                    console.log("  \uD83D\uDD0D Found nested auto-layout padding at depth ".concat(depth, ":"), padding, "(".concat(node.name, ")"));
                    return padding;
                }
            }
            // Recursively search children
            if (node.children && node.children.length > 0) {
                for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    var childPadding = this.findNestedAutolayoutPadding(child, depth + 1);
                    if (childPadding) {
                        return childPadding;
                    }
                }
            }
            return null;
        }
        catch (error) {
            console.warn("\u26A0\uFE0F Error searching nested padding at depth ".concat(depth, ":"), error);
            return null;
        }
    };
    /**
     * Extracts internal padding information from a component, including nested auto-layout containers
     */
    ComponentScanner.extractInternalPadding = function (comp) {
        try {
            // For component sets, analyze the default variant
            var targetNode = comp;
            if (comp.type === 'COMPONENT_SET') {
                var defaultVariant = comp.defaultVariant || comp.children[0];
                if (defaultVariant && defaultVariant.type === 'COMPONENT') {
                    targetNode = defaultVariant;
                }
            }
            if (targetNode.type === 'COMPONENT') {
                console.log("\uD83D\uDD0D Analyzing component \"".concat(comp.name, "\" for padding..."));
                // Method 1: Check if root component has auto-layout with padding
                if (targetNode.layoutMode !== 'NONE') {
                    var rootPadding = {
                        paddingTop: targetNode.paddingTop || 0,
                        paddingLeft: targetNode.paddingLeft || 0,
                        paddingRight: targetNode.paddingRight || 0,
                        paddingBottom: targetNode.paddingBottom || 0
                    };
                    // If root has meaningful padding, return it
                    if (rootPadding.paddingTop > 0 || rootPadding.paddingLeft > 0 ||
                        rootPadding.paddingRight > 0 || rootPadding.paddingBottom > 0) {
                        console.log("  \u2705 Found root auto-layout padding:", rootPadding);
                        return rootPadding;
                    }
                }
                // Method 2: Search for nested auto-layout containers with padding
                var nestedPadding = this.findNestedAutolayoutPadding(targetNode);
                if (nestedPadding) {
                    console.log("  \u2705 Using nested auto-layout padding:", nestedPadding);
                    return nestedPadding;
                }
                // Method 3: Fallback to geometric detection (original method)
                if (targetNode.children && targetNode.children.length > 0) {
                    var firstChild = targetNode.children[0];
                    if (firstChild.x !== undefined && firstChild.y !== undefined) {
                        var paddingLeft = firstChild.x;
                        var paddingTop = firstChild.y;
                        var paddingRight = targetNode.width - (firstChild.x + firstChild.width);
                        var paddingBottom = targetNode.height - (firstChild.y + firstChild.height);
                        // Only return if padding values are reasonable (between 0 and 100)
                        if (paddingLeft >= 0 && paddingTop >= 0 && paddingRight >= 0 && paddingBottom >= 0 &&
                            paddingLeft <= 100 && paddingTop <= 100 && paddingRight <= 100 && paddingBottom <= 100) {
                            var geometricPadding = {
                                paddingTop: Math.round(paddingTop),
                                paddingLeft: Math.round(paddingLeft),
                                paddingRight: Math.round(paddingRight),
                                paddingBottom: Math.round(paddingBottom)
                            };
                            console.log("  \u2705 Using geometric padding detection:", geometricPadding);
                            return geometricPadding;
                        }
                    }
                }
                console.log("  \u274C No meaningful padding found for \"".concat(comp.name, "\""));
            }
            return null;
        }
        catch (error) {
            console.warn("\u26A0\uFE0F Error extracting padding for component ".concat(comp.name, ":"), error);
            return null;
        }
    };
    /**
     * Analyzes a single component to extract metadata
     */
    ComponentScanner.analyzeComponent = function (comp) {
        return __awaiter(this, void 0, void 0, function () {
            var name, suggestedType, confidence, textLayers, textHierarchy, componentInstances, vectorNodes, imageNodes, styleInfo, internalPadding, variants, variantDetails, variantProps;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        name = comp.name;
                        suggestedType = this.guessComponentType(name.toLowerCase());
                        confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
                        textLayers = this.findTextLayers(comp);
                        textHierarchy = this.analyzeTextHierarchy(comp);
                        return [4 /*yield*/, this.findComponentInstances(comp)];
                    case 1:
                        componentInstances = _a.sent();
                        vectorNodes = this.findVectorNodes(comp);
                        imageNodes = this.findImageNodes(comp);
                        styleInfo = this.extractStyleInfo(comp);
                        internalPadding = this.extractInternalPadding(comp);
                        if (internalPadding) {
                            console.log("\uD83D\uDCCF Found internal padding for \"".concat(comp.name, "\":"), internalPadding);
                        }
                        variants = [];
                        variantDetails = {};
                        if (comp.type === 'COMPONENT_SET') {
                            variantProps = comp.variantGroupProperties;
                            if (variantProps) {
                                variants = Object.keys(variantProps);
                                Object.entries(variantProps).forEach(function (_a) {
                                    var propName = _a[0], propInfo = _a[1];
                                    if (propInfo.values && propInfo.values.length > 0) {
                                        variantDetails[propName] = __spreadArray([], propInfo.values, true).sort();
                                        console.log("\u2705 Found variant property: ".concat(propName, " with values: [").concat(propInfo.values.join(', '), "]"));
                                    }
                                });
                                console.log("\uD83C\uDFAF Variant details for \"".concat(comp.name, "\":"), variantDetails);
                            }
                        }
                        return [2 /*return*/, {
                                id: comp.id,
                                name: name,
                                suggestedType: suggestedType,
                                confidence: confidence,
                                variants: variants.length > 0 ? variants : undefined,
                                variantDetails: Object.keys(variantDetails).length > 0 ? variantDetails : undefined,
                                textLayers: textLayers.length > 0 ? textLayers : undefined,
                                textHierarchy: textHierarchy.length > 0 ? textHierarchy : undefined,
                                componentInstances: componentInstances.length > 0 ? componentInstances : undefined,
                                vectorNodes: vectorNodes.length > 0 ? vectorNodes : undefined,
                                imageNodes: imageNodes.length > 0 ? imageNodes : undefined,
                                styleInfo: styleInfo, // NEW: Include color and style information
                                internalPadding: internalPadding, // NEW: Include internal padding information
                                isFromLibrary: false
                            }];
                }
            });
        });
    };
    /**
     * Intelligent component type detection based on naming patterns
     */
    ComponentScanner.guessComponentType = function (name) {
        var _a;
        var patterns = {
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
        var priorityPatterns = [
            'icon-button', 'upload', 'form', 'context-menu', 'modal-header', 'list-item',
            'appbar', 'dialog', 'snackbar', 'bottomsheet', 'actionsheet', 'searchbar',
            'fab', 'breadcrumb', 'pagination', 'skeleton', 'textarea', 'checkbox',
            'radio', 'switch', 'slider', 'tab', 'navigation', 'tooltip', 'badge',
            'progress', 'avatar', 'chip', 'stepper', 'chart', 'table', 'calendar',
            'timeline', 'gallery', 'rating'
        ];
        for (var _i = 0, priorityPatterns_1 = priorityPatterns; _i < priorityPatterns_1.length; _i++) {
            var type = priorityPatterns_1[_i];
            if ((_a = patterns[type]) === null || _a === void 0 ? void 0 : _a.test(name))
                return type;
        }
        for (var type in patterns) {
            if (Object.prototype.hasOwnProperty.call(patterns, type) && !priorityPatterns.includes(type)) {
                if (patterns[type].test(name))
                    return type;
            }
        }
        return 'unknown';
    };
    /**
     * Calculates confidence score for component type detection
     */
    ComponentScanner.calculateConfidence = function (name, suggestedType) {
        if (suggestedType === 'unknown')
            return 0.1;
        if (name.toLowerCase() === suggestedType.toLowerCase())
            return 0.95;
        if (name.includes(suggestedType))
            return 0.9;
        if (name.toLowerCase().includes(suggestedType + '-') || name.toLowerCase().includes(suggestedType + '_'))
            return 0.85;
        return 0.7;
    };
    /**
     * Finds and catalogs text layers within a component
     */
    ComponentScanner.findTextLayers = function (comp) {
        var textLayers = [];
        try {
            var nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                var allNodes = nodeToAnalyze.findAll(function (node) { return node.type === 'TEXT'; });
                allNodes.forEach(function (node) {
                    if (node.type === 'TEXT' && node.name) {
                        var textNode = node;
                        textLayers.push(textNode.name);
                        try {
                            var chars = textNode.characters || '[empty]';
                            console.log("\uD83D\uDCDD Found text layer: \"".concat(textNode.name, "\" with content: \"").concat(chars, "\""));
                        }
                        catch (charError) {
                            console.log("\uD83D\uDCDD Found text layer: \"".concat(textNode.name, "\" (could not read characters)"));
                        }
                    }
                });
            }
        }
        catch (e) {
            console.error("Error finding text layers in \"".concat(comp.name, "\":"), e);
        }
        return textLayers;
    };
    /**
     * Analyzes text nodes by fontSize/fontWeight and classifies by visual prominence
     */
    ComponentScanner.analyzeTextHierarchy = function (comp) {
        var _this = this;
        var textHierarchy = [];
        try {
            var nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                var textNodes = nodeToAnalyze.findAll(function (node) { return node.type === 'TEXT'; });
                // Collect font info for classification
                var fontSizes_1 = [];
                var textNodeData_1 = [];
                textNodes.forEach(function (node) {
                    if (node.type === 'TEXT') {
                        var textNode = node;
                        try {
                            var fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 14;
                            var fontWeight = textNode.fontWeight || 'normal';
                            fontSizes_1.push(fontSize);
                            textNodeData_1.push({ node: textNode, fontSize: fontSize, fontWeight: fontWeight });
                        }
                        catch (e) {
                            console.warn("Could not read font properties for text node \"".concat(textNode.name, "\""));
                        }
                    }
                });
                // Sort font sizes to determine hierarchy thresholds
                var uniqueSizes_1 = __spreadArray([], new Set(fontSizes_1), true).sort(function (a, b) { return b - a; });
                textNodeData_1.forEach(function (_a) {
                    var node = _a.node, fontSize = _a.fontSize, fontWeight = _a.fontWeight;
                    var classification = 'tertiary';
                    if (uniqueSizes_1.length >= 3) {
                        if (fontSize >= uniqueSizes_1[0])
                            classification = 'primary';
                        else if (fontSize >= uniqueSizes_1[1])
                            classification = 'secondary';
                        else
                            classification = 'tertiary';
                    }
                    else if (uniqueSizes_1.length === 2) {
                        classification = fontSize >= uniqueSizes_1[0] ? 'primary' : 'secondary';
                    }
                    else {
                        // Single font size or unable to determine - classify by font weight
                        var weight = String(fontWeight).toLowerCase();
                        if (weight.includes('bold') || weight.includes('700') || weight.includes('800') || weight.includes('900')) {
                            classification = 'primary';
                        }
                        else if (weight.includes('medium') || weight.includes('500') || weight.includes('600')) {
                            classification = 'secondary';
                        }
                        else {
                            classification = 'tertiary';
                        }
                    }
                    var characters;
                    try {
                        characters = node.characters || '[empty]';
                    }
                    catch (e) {
                        characters = undefined;
                    }
                    // NEW: Extract text color
                    var textColor;
                    try {
                        if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
                            var firstFill = node.fills[0];
                            if (firstFill.visible !== false) {
                                textColor = _this.convertPaintToColorInfo(firstFill) || undefined;
                            }
                        }
                    }
                    catch (e) {
                        console.warn("Could not extract text color for \"".concat(node.name, "\""));
                    }
                    textHierarchy.push({
                        nodeName: node.name,
                        nodeId: node.id,
                        fontSize: fontSize,
                        fontWeight: fontWeight,
                        classification: classification,
                        visible: node.visible,
                        characters: characters,
                        textColor: textColor // NEW: Include text color information
                    });
                });
            }
        }
        catch (e) {
            console.error("Error analyzing text hierarchy in \"".concat(comp.name, "\":"), e);
        }
        return textHierarchy;
    };
    /**
     * Finds all nested COMPONENT/INSTANCE nodes (often icons)
     */
    ComponentScanner.findComponentInstances = function (comp) {
        return __awaiter(this, void 0, void 0, function () {
            var componentInstances, nodeToAnalyze, instanceNodes, _i, instanceNodes_1, node, instance, mainComponent, e_4, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        componentInstances = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
                        if (!(nodeToAnalyze && 'findAll' in nodeToAnalyze)) return [3 /*break*/, 8];
                        instanceNodes = nodeToAnalyze.findAll(function (node) {
                            return node.type === 'COMPONENT' || node.type === 'INSTANCE';
                        });
                        _i = 0, instanceNodes_1 = instanceNodes;
                        _a.label = 2;
                    case 2:
                        if (!(_i < instanceNodes_1.length)) return [3 /*break*/, 8];
                        node = instanceNodes_1[_i];
                        if (!(node.type === 'COMPONENT' || node.type === 'INSTANCE')) return [3 /*break*/, 7];
                        instance = {
                            nodeName: node.name,
                            nodeId: node.id,
                            visible: node.visible
                        };
                        if (!(node.type === 'INSTANCE')) return [3 /*break*/, 6];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, node.getMainComponentAsync()];
                    case 4:
                        mainComponent = _a.sent();
                        instance.componentId = mainComponent === null || mainComponent === void 0 ? void 0 : mainComponent.id;
                        return [3 /*break*/, 6];
                    case 5:
                        e_4 = _a.sent();
                        console.warn("Could not get main component ID for instance \"".concat(node.name, "\""));
                        return [3 /*break*/, 6];
                    case 6:
                        componentInstances.push(instance);
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 2];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        e_5 = _a.sent();
                        console.error("Error finding component instances in \"".concat(comp.name, "\":"), e_5);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, componentInstances];
                }
            });
        });
    };
    /**
     * Finds all VECTOR nodes (direct SVG icons)
     */
    ComponentScanner.findVectorNodes = function (comp) {
        var vectorNodes = [];
        try {
            var nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                var vectors = nodeToAnalyze.findAll(function (node) { return node.type === 'VECTOR'; });
                vectors.forEach(function (node) {
                    if (node.type === 'VECTOR') {
                        vectorNodes.push({
                            nodeName: node.name,
                            nodeId: node.id,
                            visible: node.visible
                        });
                    }
                });
            }
        }
        catch (e) {
            console.error("Error finding vector nodes in \"".concat(comp.name, "\":"), e);
        }
        return vectorNodes;
    };
    /**
     * Finds all nodes that can accept image fills (RECTANGLE, ELLIPSE with image fills)
     */
    ComponentScanner.findImageNodes = function (comp) {
        var imageNodes = [];
        try {
            var nodeToAnalyze = comp.type === 'COMPONENT_SET' ? comp.defaultVariant : comp;
            if (nodeToAnalyze && 'findAll' in nodeToAnalyze) {
                var shapeNodes = nodeToAnalyze.findAll(function (node) {
                    return node.type === 'RECTANGLE' || node.type === 'ELLIPSE';
                });
                shapeNodes.forEach(function (node) {
                    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
                        var hasImageFill = false;
                        try {
                            var fills = node.fills;
                            if (Array.isArray(fills)) {
                                hasImageFill = fills.some(function (fill) {
                                    return typeof fill === 'object' && fill !== null && fill.type === 'IMAGE';
                                });
                            }
                        }
                        catch (e) {
                            console.warn("Could not check fills for node \"".concat(node.name, "\""));
                        }
                        imageNodes.push({
                            nodeName: node.name,
                            nodeId: node.id,
                            nodeType: node.type,
                            visible: node.visible,
                            hasImageFill: hasImageFill
                        });
                    }
                });
            }
        }
        catch (e) {
            console.error("Error finding image nodes in \"".concat(comp.name, "\":"), e);
        }
        return imageNodes;
    };
    /**
     * Generate LLM prompt based on scanned components and color styles
     */
    ComponentScanner.generateLLMPrompt = function (components, colorStyles) {
        var _a;
        var componentsByType = {};
        components.forEach(function (comp) {
            if (comp.confidence >= 0.7) {
                if (!componentsByType[comp.suggestedType])
                    componentsByType[comp.suggestedType] = [];
                componentsByType[comp.suggestedType].push(comp);
            }
        });
        var prompt = "# AIDesigner JSON Generation Instructions\n\n";
        // Add Color Styles section if available
        if (colorStyles) {
            var totalColorStyles = Object.values(colorStyles).reduce(function (sum, styles) { return sum + styles.length; }, 0);
            if (totalColorStyles > 0) {
                prompt += "## Available Color Styles in Design System:\n\n";
                Object.entries(colorStyles).forEach(function (_a) {
                    var category = _a[0], styles = _a[1];
                    if (styles.length > 0) {
                        prompt += "### ".concat(category.toUpperCase(), " COLORS\n");
                        styles.forEach(function (style) {
                            prompt += "- **".concat(style.name, "**: ").concat(style.colorInfo.color);
                            if (style.variant) {
                                prompt += " (variant: ".concat(style.variant, ")");
                            }
                            if (style.description) {
                                prompt += " - ".concat(style.description);
                            }
                            prompt += "\n";
                        });
                        prompt += "\n";
                    }
                });
                prompt += "### Color Usage Guidelines:\n";
                prompt += "- Use PRIMARY colors for main actions, headers, and brand elements\n";
                prompt += "- Use SECONDARY colors for supporting actions and accents\n";
                prompt += "- Use NEUTRAL colors for text, backgrounds, and borders\n";
                prompt += "- Use SEMANTIC colors for success/error/warning states\n";
                prompt += "- Use SURFACE colors for backgrounds and containers\n";
                prompt += "- Reference colors by their exact name: \"".concat(((_a = colorStyles.primary[0]) === null || _a === void 0 ? void 0 : _a.name) || 'Primary/500', "\"\n\n");
            }
        }
        prompt += "## Available Components in Design System:\n\n";
        Object.keys(componentsByType).sort().forEach(function (type) {
            var _a, _b, _c, _d, _e, _f;
            var comps = componentsByType[type];
            var bestComponent = comps.sort(function (a, b) { return b.confidence - a.confidence; })[0];
            prompt += "### ".concat(type.toUpperCase(), "\n");
            prompt += "- Component ID: \"".concat(bestComponent.id, "\"\n");
            prompt += "- Component Name: \"".concat(bestComponent.name, "\"\n");
            if ((_a = bestComponent.textLayers) === null || _a === void 0 ? void 0 : _a.length)
                prompt += "- Text Layers: ".concat(bestComponent.textLayers.map(function (l) { return "\"".concat(l, "\""); }).join(', '), "\n");
            if ((_b = bestComponent.textHierarchy) === null || _b === void 0 ? void 0 : _b.length) {
                prompt += "- Text Hierarchy:\n";
                bestComponent.textHierarchy.forEach(function (text) {
                    prompt += "  - ".concat(text.classification.toUpperCase(), ": \"").concat(text.nodeName, "\" (").concat(text.fontSize, "px, ").concat(text.fontWeight).concat(text.visible ? '' : ', hidden', ")\n");
                });
            }
            if ((_c = bestComponent.componentInstances) === null || _c === void 0 ? void 0 : _c.length) {
                prompt += "- Component Instances: ".concat(bestComponent.componentInstances.map(function (c) { return "\"".concat(c.nodeName, "\"").concat(c.visible ? '' : ' (hidden)'); }).join(', '), "\n");
            }
            if ((_d = bestComponent.vectorNodes) === null || _d === void 0 ? void 0 : _d.length) {
                prompt += "- Vector Icons: ".concat(bestComponent.vectorNodes.map(function (v) { return "\"".concat(v.nodeName, "\"").concat(v.visible ? '' : ' (hidden)'); }).join(', '), "\n");
            }
            if ((_e = bestComponent.imageNodes) === null || _e === void 0 ? void 0 : _e.length) {
                prompt += "- Image Containers: ".concat(bestComponent.imageNodes.map(function (i) { return "\"".concat(i.nodeName, "\" (").concat(i.nodeType).concat(i.hasImageFill ? ', has image' : '').concat(i.visible ? '' : ', hidden', ")"); }).join(', '), "\n");
            }
            if (bestComponent.variantDetails && Object.keys(bestComponent.variantDetails).length > 0) {
                prompt += "\n  - \uD83C\uDFAF VARIANTS AVAILABLE:\n";
                Object.entries(bestComponent.variantDetails).forEach(function (_a) {
                    var propName = _a[0], values = _a[1];
                    prompt += "    - **".concat(propName, "**: [").concat(values.map(function (v) { return "\"".concat(v, "\""); }).join(', '), "]\n");
                    var propLower = propName.toLowerCase();
                    if (propLower.includes('condition') || propLower.includes('layout')) {
                        prompt += "      \uD83D\uDCA1 Layout control: ".concat(values.includes('1-line') ? '"1-line" = single line, ' : '').concat(values.includes('2-line') ? '"2-line" = detailed view' : '', "\n");
                    }
                    if (propLower.includes('leading') || propLower.includes('start')) {
                        prompt += "      \uD83D\uDCA1 Leading element: \"Icon\" = shows leading icon, \"None\" = text only\n";
                    }
                    if (propLower.includes('trailing') || propLower.includes('end')) {
                        prompt += "      \uD83D\uDCA1 Trailing element: \"Icon\" = shows trailing icon/chevron, \"None\" = no trailing element\n";
                    }
                    if (propLower.includes('state') || propLower.includes('status')) {
                        prompt += "      \uD83D\uDCA1 Component state: controls enabled/disabled/selected appearance\n";
                    }
                    if (propLower.includes('size')) {
                        prompt += "      \uD83D\uDCA1 Size control: affects padding, text size, and touch targets\n";
                    }
                    if (propLower.includes('type') || propLower.includes('style') || propLower.includes('emphasis')) {
                        prompt += "      \uD83D\uDCA1 Visual emphasis: controls hierarchy and visual weight\n";
                    }
                });
                prompt += "\n  - \u26A1 QUICK VARIANT GUIDE:\n";
                prompt += "    - \"single line\" request \u2192 use \"Condition\": \"1-line\"\n";
                prompt += "    - \"with icon\" request \u2192 use \"Leading\": \"Icon\"\n";
                prompt += "    - \"arrow\" or \"chevron\" \u2192 use \"Trailing\": \"Icon\"\n";
                prompt += "    - \"simple\" or \"minimal\" \u2192 omit variants to use defaults\n";
                prompt += "    - Only specify variants you want to change from defaults\n";
            }
            prompt += "- Page: ".concat(((_f = bestComponent.pageInfo) === null || _f === void 0 ? void 0 : _f.pageName) || 'Unknown', "\n\n");
        });
        prompt += "## JSON Structure & Rules:\n\n### Variant Usage Rules:\n- **Variants must be in a separate \"variants\" object inside properties**\n- **NEVER mix variants with regular properties at the same level**\n- Variant properties are case-sensitive: \"Condition\" not \"condition\"\n- Variant values are case-sensitive: \"1-line\" not \"1-Line\"\n\n### \u2705 CORRECT Variant Structure:\n```json\n{\n  \"type\": \"list-item\",\n  \"componentNodeId\": \"10:123\",\n  \"properties\": {\n    \"text\": \"Personal details\",\n    \"horizontalSizing\": \"FILL\",\n    \"variants\": {\n      \"Condition\": \"1-line\",\n      \"Leading\": \"Icon\", \n      \"Trailing\": \"Icon\"\n    }\n  }\n}\n```\n\n### \u274C WRONG - Never do this:\n```json\n{\n  \"properties\": {\n    \"text\": \"Personal details\",\n    \"Condition\": \"1-line\",    // WRONG: variants mixed with properties\n    \"Leading\": \"Icon\"         // WRONG: should be in variants object\n  }\n}\n```\n\n### Settings Screen with Proper Variants:\n```json\n{\n  \"layoutContainer\": {\n    \"name\": \"Settings Screen\",\n    \"layoutMode\": \"VERTICAL\",\n    \"width\": 360,\n    \"itemSpacing\": 8\n  },\n  \"items\": [\n    {\n      \"type\": \"list-item\",\n      \"componentNodeId\": \"10:123\",\n      \"properties\": {\n        \"text\": \"Personal details\",\n        \"horizontalSizing\": \"FILL\",\n        \"variants\": {\n          \"Condition\": \"1-line\",\n          \"Leading\": \"Icon\",\n          \"Trailing\": \"None\"\n        }\n      }\n    },\n    {\n      \"type\": \"list-item\",\n      \"componentNodeId\": \"10:123\",\n      \"properties\": {\n        \"text\": \"Change language\",\n        \"trailing-text\": \"English\",\n        \"horizontalSizing\": \"FILL\",\n        \"variants\": {\n          \"Condition\": \"1-line\",\n          \"Leading\": \"Icon\",\n          \"Trailing\": \"Icon\"\n        }\n      }\n    },\n    {\n      \"type\": \"list-item\",\n      \"componentNodeId\": \"10:123\",\n      \"properties\": {\n        \"text\": \"Notifications\",\n        \"supporting-text\": \"Push notifications and email alerts\",\n        \"trailing-text\": \"On\",\n        \"horizontalSizing\": \"FILL\",\n        \"variants\": {\n          \"Condition\": \"2-line\",\n          \"Leading\": \"Icon\",\n          \"Trailing\": \"Icon\"\n        }\n      }\n    }\n  ]\n}\n```\n\n### \u2705 VARIANT BEST PRACTICES:\n- **Always use exact property names**: \"Condition\" not \"condition\"\n- **Use exact values**: \"1-line\" not \"1-Line\" or \"single-line\"\n- **Specify complete variant sets**: Include all required properties for that variant\n- **Common patterns**:\n  - Simple navigation: `\"Condition\": \"1-line\", \"Leading\": \"Icon\", \"Trailing\": \"None\"`\n  - With current value: `\"Condition\": \"1-line\", \"Leading\": \"Icon\", \"Trailing\": \"Icon\"`\n  - Detailed info: `\"Condition\": \"2-line\", \"Leading\": \"Icon\", \"Trailing\": \"Icon\"`\n\n*\uD83C\uDFAF Pro tip: Study your design system's variant combinations in Figma to understand which variants work together.*\n";
        return prompt;
    };
    /**
     * Save scan results to Figma storage
     */
    ComponentScanner.saveLastScanResults = function (components) {
        return __awaiter(this, void 0, void 0, function () {
            var scanSession, error_9, fallbackError_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 8]);
                        scanSession = {
                            components: components,
                            scanTime: Date.now(),
                            version: "1.0",
                            fileKey: figma.root.id
                        };
                        return [4 /*yield*/, figma.clientStorage.setAsync('design-system-scan', scanSession)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, figma.clientStorage.setAsync('last-scan-results', components)];
                    case 2:
                        _a.sent();
                        console.log("\uD83D\uDCBE Saved ".concat(components.length, " components with session data"));
                        return [3 /*break*/, 8];
                    case 3:
                        error_9 = _a.sent();
                        console.error("❌ Error saving scan results:", error_9);
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, figma.clientStorage.setAsync('last-scan-results', components)];
                    case 5:
                        _a.sent();
                        console.log("💾 Fallback save successful");
                        return [3 /*break*/, 7];
                    case 6:
                        fallbackError_2 = _a.sent();
                        console.warn("⚠️ Could not save scan results:", fallbackError_2);
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get component ID by type for UI generation
     */
    ComponentScanner.getComponentIdByType = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            var searchType, scanResults, matchingComponent, nameMatchingComponent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchType = type.toLowerCase();
                        return [4 /*yield*/, figma.clientStorage.getAsync('last-scan-results')];
                    case 1:
                        scanResults = _a.sent();
                        if (scanResults && Array.isArray(scanResults)) {
                            matchingComponent = scanResults.find(function (comp) { return comp.suggestedType.toLowerCase() === searchType && comp.confidence >= 0.7; });
                            if (matchingComponent)
                                return [2 /*return*/, matchingComponent.id];
                            nameMatchingComponent = scanResults.find(function (comp) { return comp.name.toLowerCase().includes(searchType); });
                            if (nameMatchingComponent)
                                return [2 /*return*/, nameMatchingComponent.id];
                        }
                        console.log("\u274C ID for type ".concat(type, " not found"));
                        return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * NEW: Extract color and style information from component
     */
    ComponentScanner.extractStyleInfo = function (node) {
        var _a, _b, _c;
        var styleInfo = {};
        try {
            // Get the primary node to analyze (for component sets, use the first variant)
            var primaryNode = node;
            if (node.type === 'COMPONENT_SET' && node.children.length > 0) {
                primaryNode = node.children[0];
            }
            // Extract fills and background colors
            var fills = this.extractFills(primaryNode);
            if (fills.length > 0) {
                styleInfo.fills = fills;
                styleInfo.primaryColor = fills[0]; // Use first fill as primary color
            }
            // Extract strokes
            var strokes = this.extractStrokes(primaryNode);
            if (strokes.length > 0) {
                styleInfo.strokes = strokes;
            }
            // Find text color from text nodes
            var textColor = this.findPrimaryTextColor(primaryNode);
            if (textColor) {
                styleInfo.textColor = textColor;
            }
            // Extract background color (look for the largest rectangle/background)
            var backgroundColor = this.findBackgroundColor(primaryNode);
            if (backgroundColor) {
                styleInfo.backgroundColor = backgroundColor;
            }
            // Log summary of extracted colors for debugging
            if (styleInfo.primaryColor || styleInfo.backgroundColor || styleInfo.textColor) {
                console.log("\uD83C\uDFA8 Colors extracted for \"".concat(node.name, "\":"), {
                    primary: (_a = styleInfo.primaryColor) === null || _a === void 0 ? void 0 : _a.color,
                    background: (_b = styleInfo.backgroundColor) === null || _b === void 0 ? void 0 : _b.color,
                    text: (_c = styleInfo.textColor) === null || _c === void 0 ? void 0 : _c.color
                });
            }
        }
        catch (error) {
            console.warn("\u26A0\uFE0F Error extracting style info for \"".concat(node.name, "\":"), error);
        }
        return styleInfo;
    };
    /**
     * Extract fill colors from a node
     */
    ComponentScanner.extractFills = function (node) {
        var colorInfos = [];
        try {
            if ('fills' in node && node.fills && Array.isArray(node.fills)) {
                for (var _i = 0, _a = node.fills; _i < _a.length; _i++) {
                    var fill = _a[_i];
                    if (fill.visible !== false) {
                        var colorInfo = this.convertPaintToColorInfo(fill);
                        if (colorInfo) {
                            colorInfos.push(colorInfo);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error extracting fills:', error);
        }
        return colorInfos;
    };
    /**
     * Extract stroke colors from a node
     */
    ComponentScanner.extractStrokes = function (node) {
        var colorInfos = [];
        try {
            if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
                for (var _i = 0, _a = node.strokes; _i < _a.length; _i++) {
                    var stroke = _a[_i];
                    if (stroke.visible !== false) {
                        var colorInfo = this.convertPaintToColorInfo(stroke);
                        if (colorInfo) {
                            colorInfos.push(colorInfo);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error extracting strokes:', error);
        }
        return colorInfos;
    };
    /**
     * Convert Figma Paint to ColorInfo
     */
    ComponentScanner.convertPaintToColorInfo = function (paint) {
        var _this = this;
        try {
            if (paint.type === 'SOLID' && paint.color) {
                return {
                    type: 'SOLID',
                    color: this.rgbToHex(paint.color),
                    opacity: paint.opacity || 1
                };
            }
            if (paint.type === 'GRADIENT_LINEAR' && paint.gradientStops) {
                return {
                    type: 'GRADIENT_LINEAR',
                    gradientStops: paint.gradientStops.map(function (stop) { return ({
                        color: _this.rgbToHex(stop.color),
                        position: stop.position
                    }); }),
                    opacity: paint.opacity || 1
                };
            }
            // Add support for other gradient types
            if ((paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') && paint.gradientStops) {
                return {
                    type: paint.type,
                    gradientStops: paint.gradientStops.map(function (stop) { return ({
                        color: _this.rgbToHex(stop.color),
                        position: stop.position
                    }); }),
                    opacity: paint.opacity || 1
                };
            }
            if (paint.type === 'IMAGE') {
                return {
                    type: 'IMAGE',
                    opacity: paint.opacity || 1
                };
            }
        }
        catch (error) {
            console.warn('Error converting paint to color info:', error);
        }
        return null;
    };
    /**
     * Convert RGB to hex color
     */
    ComponentScanner.rgbToHex = function (rgb) {
        var toHex = function (value) {
            var hex = Math.round(value * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return "#".concat(toHex(rgb.r)).concat(toHex(rgb.g)).concat(toHex(rgb.b));
    };
    /**
     * Find primary text color by analyzing text nodes
     */
    ComponentScanner.findPrimaryTextColor = function (node) {
        try {
            var textNodes = node.findAll(function (n) { return n.type === 'TEXT'; });
            for (var _i = 0, textNodes_1 = textNodes; _i < textNodes_1.length; _i++) {
                var textNode = textNodes_1[_i];
                if (textNode.visible && textNode.fills && Array.isArray(textNode.fills)) {
                    for (var _a = 0, _b = textNode.fills; _a < _b.length; _a++) {
                        var fill = _b[_a];
                        if (fill.visible !== false && fill.type === 'SOLID') {
                            return this.convertPaintToColorInfo(fill);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error finding text color:', error);
        }
        return null;
    };
    /**
     * Find background color by analyzing the largest rectangle or container
     */
    ComponentScanner.findBackgroundColor = function (node) {
        try {
            // Look for rectangles that could be backgrounds
            var rectangles = node.findAll(function (n) {
                return n.type === 'RECTANGLE' || n.type === 'FRAME' || n.type === 'COMPONENT';
            });
            // Sort by size (area) to find the largest one that's likely the background
            rectangles.sort(function (a, b) {
                var areaA = a.width * a.height;
                var areaB = b.width * b.height;
                return areaB - areaA;
            });
            for (var _i = 0, rectangles_1 = rectangles; _i < rectangles_1.length; _i++) {
                var rect = rectangles_1[_i];
                if ('fills' in rect && rect.fills && Array.isArray(rect.fills)) {
                    for (var _a = 0, _b = rect.fills; _a < _b.length; _a++) {
                        var fill = _b[_a];
                        if (fill.visible !== false) {
                            var colorInfo = this.convertPaintToColorInfo(fill);
                            if (colorInfo && colorInfo.type === 'SOLID') {
                                return colorInfo;
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error finding background color:', error);
        }
        return null;
    };
    return ComponentScanner;
}());
exports.ComponentScanner = ComponentScanner;
