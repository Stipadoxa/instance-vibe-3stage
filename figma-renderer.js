"use strict";
// src/core/figma-renderer.ts
// UI generation and rendering engine for AIDesigner
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.FigmaRenderer = void 0;
var component_scanner_1 = require("./component-scanner");
var session_manager_1 = require("./session-manager");
var component_property_engine_1 = require("./component-property-engine");
var json_migrator_1 = require("./json-migrator");
var FigmaRenderer = /** @class */ (function () {
    function FigmaRenderer() {
    }
    /**
     * Main UI generation function - creates UI from structured JSON data
     */
    FigmaRenderer.generateUIFromData = function (layoutData, parentNode) {
        return __awaiter(this, void 0, void 0, function () {
            var currentFrame, containerData, items, _loop_1, this_1, _i, items_1, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        containerData = layoutData.layoutContainer || layoutData;
                        if (parentNode.type === 'PAGE' && containerData) {
                            currentFrame = figma.createFrame();
                            parentNode.appendChild(currentFrame);
                        }
                        else if (parentNode.type === 'FRAME') {
                            currentFrame = parentNode;
                        }
                        else {
                            figma.notify("Cannot add items without a parent frame.", { error: true });
                            return [2 /*return*/, figma.createFrame()];
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
                                    currentFrame.itemSpacing = 'AUTO';
                                }
                                else {
                                    currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
                                }
                                // Layout wrap support
                                if (containerData.layoutWrap !== undefined) {
                                    currentFrame.layoutWrap = containerData.layoutWrap;
                                }
                                // Primary axis alignment
                                if (containerData.primaryAxisAlignItems) {
                                    currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
                                }
                                // Counter axis alignment
                                if (containerData.counterAxisAlignItems) {
                                    currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
                                }
                                // Sizing modes
                                if (containerData.primaryAxisSizingMode) {
                                    currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
                                }
                                else {
                                    currentFrame.primaryAxisSizingMode = "AUTO";
                                }
                                if (containerData.counterAxisSizingMode) {
                                    currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
                                }
                            }
                            // Size constraints - wrapped in try-catch to prevent property setter errors
                            try {
                                if (containerData.minWidth !== undefined) {
                                    currentFrame.minWidth = containerData.minWidth;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set minWidth:', e.message);
                            }
                            try {
                                if (containerData.maxWidth !== undefined) {
                                    currentFrame.maxWidth = containerData.maxWidth;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set maxWidth:', e.message);
                            }
                            try {
                                if (containerData.minHeight !== undefined) {
                                    currentFrame.minHeight = containerData.minHeight;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set minHeight:', e.message);
                            }
                            try {
                                if (containerData.maxHeight !== undefined) {
                                    currentFrame.maxHeight = containerData.maxHeight;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set maxHeight:', e.message);
                            }
                            if (containerData.width) {
                                if (currentFrame.layoutMode !== 'NONE') {
                                    // For auto-layout frames, set width directly and let auto-layout handle height
                                    currentFrame.width = containerData.width;
                                    if (!containerData.counterAxisSizingMode) {
                                        currentFrame.counterAxisSizingMode = "FIXED";
                                    }
                                }
                                else {
                                    // For regular frames, use resize
                                    currentFrame.resize(containerData.width, currentFrame.height);
                                }
                            }
                            else if (!containerData.counterAxisSizingMode) {
                                currentFrame.counterAxisSizingMode = "AUTO";
                            }
                        }
                        items = layoutData.items || containerData.items;
                        if (!items || !Array.isArray(items))
                            return [2 /*return*/, currentFrame];
                        _loop_1 = function (item) {
                            var nestedFrame, nestedFrame, componentNode, masterComponent, instance, _b, cleanProperties, variants, sanitizedProps, availableVariants_1, validVariants_1, hasValidVariants_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!(item.type === 'layoutContainer')) return [3 /*break*/, 2];
                                        nestedFrame = figma.createFrame();
                                        currentFrame.appendChild(nestedFrame);
                                        // Apply child layout properties
                                        this_1.applyChildLayoutProperties(nestedFrame, item);
                                        return [4 /*yield*/, this_1.generateUIFromData({ layoutContainer: item, items: item.items }, nestedFrame)];
                                    case 1:
                                        _c.sent();
                                        return [3 /*break*/, 14];
                                    case 2:
                                        if (!(item.type === 'frame' && item.layoutContainer)) return [3 /*break*/, 4];
                                        nestedFrame = figma.createFrame();
                                        currentFrame.appendChild(nestedFrame);
                                        return [4 /*yield*/, this_1.generateUIFromData(item, nestedFrame)];
                                    case 3:
                                        _c.sent();
                                        return [3 /*break*/, 14];
                                    case 4:
                                        if (!(item.type === 'native-text' || item.type === 'text')) return [3 /*break*/, 6];
                                        return [4 /*yield*/, this_1.createTextNode(item, currentFrame)];
                                    case 5:
                                        _c.sent();
                                        return [2 /*return*/, "continue"];
                                    case 6:
                                        if (!(item.type === 'native-rectangle')) return [3 /*break*/, 8];
                                        return [4 /*yield*/, this_1.createRectangleNode(item, currentFrame)];
                                    case 7:
                                        _c.sent();
                                        return [2 /*return*/, "continue"];
                                    case 8:
                                        if (!(item.type === 'native-circle')) return [3 /*break*/, 10];
                                        return [4 /*yield*/, this_1.createEllipseNode(item, currentFrame)];
                                    case 9:
                                        _c.sent();
                                        return [2 /*return*/, "continue"];
                                    case 10:
                                        if (!item.componentNodeId)
                                            return [2 /*return*/, "continue"];
                                        return [4 /*yield*/, figma.getNodeByIdAsync(item.componentNodeId)];
                                    case 11:
                                        componentNode = _c.sent();
                                        if (!componentNode) {
                                            console.warn("\u26A0\uFE0F Component with ID ".concat(item.componentNodeId, " not found. Skipping."));
                                            return [2 /*return*/, "continue"];
                                        }
                                        masterComponent = (componentNode.type === 'COMPONENT_SET'
                                            ? componentNode.defaultVariant
                                            : componentNode);
                                        if (!masterComponent || masterComponent.type !== 'COMPONENT') {
                                            console.warn("\u26A0\uFE0F Could not find a valid master component for ID ".concat(item.componentNodeId, ". Skipping."));
                                            return [2 /*return*/, "continue"];
                                        }
                                        instance = masterComponent.createInstance();
                                        currentFrame.appendChild(instance);
                                        console.log("\uD83D\uDD27 Creating instance of component: ".concat(masterComponent.name));
                                        console.log("\uD83D\uDD27 Raw properties:", item.properties);
                                        _b = this_1.separateVariantsFromProperties(item.properties, item.componentNodeId), cleanProperties = _b.cleanProperties, variants = _b.variants;
                                        sanitizedProps = this_1.sanitizeProperties(cleanProperties);
                                        console.log("\uD83D\uDD27 Clean properties:", sanitizedProps);
                                        console.log("\uD83D\uDD27 Extracted variants:", variants);
                                        // Apply variants
                                        if (Object.keys(variants).length > 0) {
                                            try {
                                                if (componentNode && componentNode.type === 'COMPONENT_SET') {
                                                    availableVariants_1 = componentNode.variantGroupProperties;
                                                    console.log("\uD83D\uDD0D Available variants for ".concat(componentNode.name, ":"), Object.keys(availableVariants_1 || {}));
                                                    console.log("\uD83D\uDD0D Requested variants:", variants);
                                                    if (!availableVariants_1) {
                                                        console.warn('⚠️ No variant properties found on component, skipping variant application.');
                                                    }
                                                    else {
                                                        validVariants_1 = {};
                                                        hasValidVariants_1 = false;
                                                        Object.entries(variants).forEach(function (_a) {
                                                            var propName = _a[0], propValue = _a[1];
                                                            var availableProp = availableVariants_1[propName];
                                                            if (availableProp && availableProp.values) {
                                                                // Convert boolean values to capitalized strings for Figma
                                                                var stringValue = void 0;
                                                                if (typeof propValue === 'boolean') {
                                                                    stringValue = propValue ? 'True' : 'False';
                                                                    console.log("\uD83D\uDD04 Boolean conversion: ".concat(propName, " = ").concat(propValue, " -> \"").concat(stringValue, "\""));
                                                                }
                                                                else {
                                                                    stringValue = String(propValue);
                                                                }
                                                                if (availableProp.values.includes(stringValue)) {
                                                                    validVariants_1[propName] = stringValue;
                                                                    hasValidVariants_1 = true;
                                                                    console.log("\u2705 Valid variant: ".concat(propName, " = \"").concat(stringValue, "\""));
                                                                }
                                                                else {
                                                                    console.warn("\u26A0\uFE0F Invalid value for \"".concat(propName, "\": \"").concat(stringValue, "\". Available: [").concat(availableProp.values.join(', '), "]"));
                                                                }
                                                            }
                                                            else {
                                                                console.warn("\u26A0\uFE0F Unknown variant property: \"".concat(propName, "\". Available: [").concat(Object.keys(availableVariants_1).join(', '), "]"));
                                                            }
                                                        });
                                                        if (hasValidVariants_1) {
                                                            console.log("\uD83D\uDD27 Applying variants:", validVariants_1);
                                                            instance.setProperties(validVariants_1);
                                                            console.log('✅ Variants applied successfully');
                                                        }
                                                        else {
                                                            console.warn('⚠️ No valid variants to apply, using default variant');
                                                        }
                                                    }
                                                }
                                                else {
                                                    console.log('ℹ️ Component is not a variant set, skipping variant application');
                                                }
                                            }
                                            catch (e) {
                                                console.error("❌ Error applying variants:", e);
                                                console.log("ℹ️ Continuing with default variant");
                                            }
                                        }
                                        // Apply child layout properties
                                        this_1.applyChildLayoutProperties(instance, sanitizedProps);
                                        // Apply text properties to component
                                        return [4 /*yield*/, this_1.applyTextProperties(instance, sanitizedProps)];
                                    case 12:
                                        // Apply text properties to component
                                        _c.sent();
                                        // Apply media properties to component
                                        return [4 /*yield*/, this_1.applyMediaProperties(instance, sanitizedProps)];
                                    case 13:
                                        // Apply media properties to component
                                        _c.sent();
                                        _c.label = 14;
                                    case 14: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, items_1 = items;
                        _a.label = 1;
                    case 1:
                        if (!(_i < items_1.length)) return [3 /*break*/, 4];
                        item = items_1[_i];
                        return [5 /*yield**/, _loop_1(item)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        if (parentNode.type === 'PAGE') {
                            figma.currentPage.selection = [currentFrame];
                            figma.viewport.scrollAndZoomIntoView([currentFrame]);
                            figma.notify("UI \"".concat(currentFrame.name, "\" generated!"), { timeout: 2500 });
                        }
                        return [2 /*return*/, currentFrame];
                }
            });
        });
    };
    /**
     * Dynamic UI generation with component ID resolution
     */
    FigmaRenderer.generateUIFromDataDynamic = function (layoutData) {
        return __awaiter(this, void 0, void 0, function () {
            function resolveComponentIds(items) {
                return __awaiter(this, void 0, void 0, function () {
                    var _i, items_2, item, resolvedId;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _i = 0, items_2 = items;
                                _a.label = 1;
                            case 1:
                                if (!(_i < items_2.length)) return [3 /*break*/, 10];
                                item = items_2[_i];
                                if (!(item.type === 'layoutContainer')) return [3 /*break*/, 4];
                                if (!(item.items && Array.isArray(item.items))) return [3 /*break*/, 3];
                                return [4 /*yield*/, resolveComponentIds(item.items)];
                            case 2:
                                _a.sent();
                                _a.label = 3;
                            case 3: return [3 /*break*/, 9];
                            case 4:
                                // SKIP native elements - they don't need component IDs
                                if (item.type === 'native-text' ||
                                    item.type === 'text' ||
                                    item.type === 'native-rectangle' ||
                                    item.type === 'native-circle') {
                                    console.log("\u2139\uFE0F Skipping native element: ".concat(item.type));
                                    return [3 /*break*/, 9];
                                }
                                if (!(item.type === 'frame' && item.items)) return [3 /*break*/, 6];
                                return [4 /*yield*/, resolveComponentIds(item.items)];
                            case 5:
                                _a.sent();
                                return [3 /*break*/, 9];
                            case 6:
                                if (!(item.type !== 'frame')) return [3 /*break*/, 9];
                                if (!(!item.componentNodeId || isPlaceholderID_1(item.componentNodeId))) return [3 /*break*/, 8];
                                console.log(" Resolving component ID for type: ".concat(item.type));
                                return [4 /*yield*/, component_scanner_1.ComponentScanner.getComponentIdByType(item.type)];
                            case 7:
                                resolvedId = _a.sent();
                                if (!resolvedId) {
                                    throw new Error("Component for type \"".concat(item.type, "\" not found in design system. Please scan your design system first."));
                                }
                                item.componentNodeId = resolvedId;
                                console.log("\u2705 Resolved ".concat(item.type, " -> ").concat(resolvedId));
                                return [3 /*break*/, 9];
                            case 8:
                                console.log("\u2705 Using existing ID for ".concat(item.type, ": ").concat(item.componentNodeId));
                                _a.label = 9;
                            case 9:
                                _i++;
                                return [3 /*break*/, 1];
                            case 10: return [2 /*return*/];
                        }
                    });
                });
            }
            var existingSchemas, migratedData, isPlaceholderID_1, e_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🚀 START generateUIFromDataDynamic', { hasLayoutData: !!layoutData, hasItems: !!(layoutData === null || layoutData === void 0 ? void 0 : layoutData.items) });
                        if (!layoutData || (!layoutData.items && !layoutData.layoutContainer)) {
                            figma.notify("Invalid JSON structure", { error: true });
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        // Enable performance optimizations
                        figma.skipInvisibleInstanceChildren = true;
                        // Load design system data if not already cached
                        return [4 /*yield*/, this.ensureDesignSystemDataLoaded()];
                    case 2:
                        // Load design system data if not already cached
                        _a.sent();
                        // Skip ComponentPropertyEngine for testing if no schemas available
                        console.log('🔧 Checking ComponentPropertyEngine schemas...');
                        existingSchemas = component_property_engine_1.ComponentPropertyEngine.getAllSchemas();
                        if (!(existingSchemas.length === 0)) return [3 /*break*/, 3];
                        console.log('⚠️ No design system schemas found - running in basic mode');
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, component_property_engine_1.ComponentPropertyEngine.initialize()];
                    case 4:
                        _a.sent();
                        console.log('✅ ComponentPropertyEngine initialized with', existingSchemas.length, 'schemas');
                        _a.label = 5;
                    case 5:
                        migratedData = json_migrator_1.JSONMigrator.migrateToSystematic(layoutData);
                        isPlaceholderID_1 = function (id) {
                            if (!id)
                                return true;
                            return id.includes('_id') ||
                                id.includes('placeholder') ||
                                !id.match(/^[0-9]+:[0-9]+$/);
                        };
                        return [4 /*yield*/, resolveComponentIds(migratedData.items)];
                    case 6:
                        _a.sent();
                        console.log('🟢 USING SYSTEMATIC GENERATION METHOD');
                        return [4 /*yield*/, this.generateUIFromDataSystematic(migratedData, figma.currentPage)];
                    case 7: return [2 /*return*/, _a.sent()];
                    case 8:
                        e_1 = _a.sent();
                        errorMessage = e_1 instanceof Error ? e_1.message : String(e_1);
                        figma.notify(errorMessage, { error: true, timeout: 4000 });
                        console.error("❌ generateUIFromDataDynamic error:", e_1);
                        return [2 /*return*/, null];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create native text element
     */
    FigmaRenderer.createTextNode = function (textData, container) {
        return __awaiter(this, void 0, void 0, function () {
            var textNode, textContent, props, fontSize, fills, colorStyle, resolvedColor, error_1, colorStyle, resolvedColor, error_2, styleName, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('Creating native text:', textData);
                        textNode = figma.createText();
                        // Load default font
                        return [4 /*yield*/, figma.loadFontAsync({ family: "Inter", style: "Regular" })];
                    case 1:
                        // Load default font
                        _b.sent();
                        textContent = textData.text || textData.content || ((_a = textData.properties) === null || _a === void 0 ? void 0 : _a.content) || textData.characters || "Text";
                        textNode.characters = textContent;
                        props = textData.properties || textData;
                        fontSize = props.fontSize || props.size || props.textSize || 16;
                        textNode.fontSize = fontSize;
                        if (!(props.fontWeight === 'bold' || props.weight === 'bold' || props.style === 'bold')) return [3 /*break*/, 3];
                        return [4 /*yield*/, figma.loadFontAsync({ family: "Inter", style: "Bold" })];
                    case 2:
                        _b.sent();
                        textNode.fontName = { family: "Inter", style: "Bold" };
                        _b.label = 3;
                    case 3:
                        // Text alignment
                        if (props.alignment === 'center' || props.textAlign === 'center') {
                            textNode.textAlignHorizontal = 'CENTER';
                        }
                        else if (props.alignment === 'right' || props.textAlign === 'right') {
                            textNode.textAlignHorizontal = 'RIGHT';
                        }
                        else {
                            textNode.textAlignHorizontal = 'LEFT';
                        }
                        if (!props.color) return [3 /*break*/, 12];
                        fills = textNode.fills;
                        if (!(fills.length > 0 && fills[0].type === 'SOLID')) return [3 /*break*/, 12];
                        if (!(typeof props.color === 'string')) return [3 /*break*/, 11];
                        console.log("\uD83C\uDFA8 Attempting to resolve semantic color: \"".concat(props.color, "\""));
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 9, , 10]);
                        return [4 /*yield*/, this.resolveColorStyleReference(props.color)];
                    case 5:
                        colorStyle = _b.sent();
                        if (!colorStyle) return [3 /*break*/, 7];
                        return [4 /*yield*/, textNode.setFillStyleIdAsync(colorStyle.id)];
                    case 6:
                        _b.sent();
                        console.log("\u2705 Applied semantic color \"".concat(props.color, "\" to text (as style reference)"));
                        return [3 /*break*/, 8];
                    case 7:
                        resolvedColor = this.resolveColorReference(props.color);
                        if (resolvedColor) {
                            textNode.fills = [this.createSolidPaint(resolvedColor)];
                            console.log("\u2705 Applied semantic color \"".concat(props.color, "\" to text (as RGB fallback)"));
                        }
                        else {
                            console.warn("\u26A0\uFE0F Could not resolve semantic color \"".concat(props.color, "\", skipping color application"));
                        }
                        _b.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_1 = _b.sent();
                        console.error("\u274C Error applying color \"".concat(props.color, "\":"), error_1);
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        // Handle RGB object (existing behavior)
                        textNode.fills = [{ type: 'SOLID', color: props.color }];
                        _b.label = 12;
                    case 12:
                        if (!props.colorStyleName) return [3 /*break*/, 19];
                        console.log("\uD83C\uDFA8 Attempting to resolve color style: \"".concat(props.colorStyleName, "\""));
                        _b.label = 13;
                    case 13:
                        _b.trys.push([13, 18, , 19]);
                        return [4 /*yield*/, this.resolveColorStyleReference(props.colorStyleName)];
                    case 14:
                        colorStyle = _b.sent();
                        if (!colorStyle) return [3 /*break*/, 16];
                        return [4 /*yield*/, textNode.setFillStyleIdAsync(colorStyle.id)];
                    case 15:
                        _b.sent();
                        console.log("\u2705 Applied color style \"".concat(props.colorStyleName, "\" to text (as style reference)"));
                        return [3 /*break*/, 17];
                    case 16:
                        resolvedColor = this.resolveColorReference(props.colorStyleName);
                        if (resolvedColor) {
                            textNode.fills = [this.createSolidPaint(resolvedColor)];
                            console.log("\u2705 Applied color style \"".concat(props.colorStyleName, "\" to text (as RGB fallback)"));
                        }
                        else {
                            console.warn("\u26A0\uFE0F Could not resolve color style \"".concat(props.colorStyleName, "\", skipping color application"));
                        }
                        _b.label = 17;
                    case 17: return [3 /*break*/, 19];
                    case 18:
                        error_2 = _b.sent();
                        console.error("\u274C Error applying color style \"".concat(props.colorStyleName, "\":"), error_2);
                        return [3 /*break*/, 19];
                    case 19:
                        if (!(props.textStyle || props.textStyleName)) return [3 /*break*/, 23];
                        styleName = props.textStyle || props.textStyleName;
                        console.log("\uD83D\uDCDD Attempting to apply text style: \"".concat(styleName, "\""));
                        _b.label = 20;
                    case 20:
                        _b.trys.push([20, 22, , 23]);
                        return [4 /*yield*/, FigmaRenderer.applyTextStyle(textNode, styleName)];
                    case 21:
                        _b.sent();
                        return [3 /*break*/, 23];
                    case 22:
                        error_3 = _b.sent();
                        console.error("\u274C Error applying text style \"".concat(styleName, "\":"), error_3);
                        return [3 /*break*/, 23];
                    case 23:
                        // Apply child layout properties
                        this.applyChildLayoutProperties(textNode, props);
                        // Text auto-resize behavior
                        if (props.horizontalSizing === 'FILL') {
                            textNode.textAutoResize = 'HEIGHT';
                        }
                        else {
                            textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
                        }
                        container.appendChild(textNode);
                        console.log('Native text created successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create native rectangle element
     */
    FigmaRenderer.createRectangleNode = function (rectData, container) {
        return __awaiter(this, void 0, void 0, function () {
            var rect;
            return __generator(this, function (_a) {
                console.log('Creating native rectangle:', rectData);
                rect = figma.createRectangle();
                // Set dimensions
                if (rectData.width && rectData.height) {
                    rect.resize(rectData.width, rectData.height);
                }
                else {
                    rect.resize(100, 100); // Default size
                }
                // Set fill color
                if (rectData.fill) {
                    rect.fills = [{ type: 'SOLID', color: rectData.fill }];
                }
                // Set corner radius
                if (rectData.cornerRadius) {
                    rect.cornerRadius = rectData.cornerRadius;
                }
                // Handle sizing
                if (rectData.horizontalSizing === 'FILL') {
                    rect.layoutAlign = 'STRETCH';
                }
                container.appendChild(rect);
                console.log('Rectangle created successfully');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Create native ellipse element
     */
    FigmaRenderer.createEllipseNode = function (ellipseData, container) {
        return __awaiter(this, void 0, void 0, function () {
            var ellipse;
            return __generator(this, function (_a) {
                console.log('Creating native ellipse:', ellipseData);
                ellipse = figma.createEllipse();
                // Set dimensions
                if (ellipseData.width && ellipseData.height) {
                    ellipse.resize(ellipseData.width, ellipseData.height);
                }
                else {
                    ellipse.resize(50, 50); // Default size
                }
                // Set fill color
                if (ellipseData.fill) {
                    ellipse.fills = [{ type: 'SOLID', color: ellipseData.fill }];
                }
                container.appendChild(ellipse);
                console.log('Ellipse created successfully');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Apply text properties to component instances using enhanced scan data
     */
    FigmaRenderer.applyTextProperties = function (instance, properties) {
        return __awaiter(this, void 0, void 0, function () {
            var allTextNodes, componentTextHierarchy, semanticMappings, legacyMappings, _loop_2, _i, _a, _b, propKey, propValue;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!properties)
                            return [2 /*return*/];
                        console.log("🔍 Applying text properties:", properties);
                        allTextNodes = instance.findAll(function (n) { return n.type === 'TEXT'; });
                        console.log("🔍 Available text nodes in component:", allTextNodes.map(function (textNode) { return ({
                            name: textNode.name,
                            id: textNode.id,
                            visible: textNode.visible,
                            chars: textNode.characters || '[empty]'
                        }); }));
                        return [4 /*yield*/, this.getComponentTextHierarchy(instance)];
                    case 1:
                        componentTextHierarchy = _c.sent();
                        console.log("🔍 Text hierarchy from scan data:", componentTextHierarchy);
                        semanticMappings = {
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
                        legacyMappings = {
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
                        _loop_2 = function (propKey, propValue) {
                            var nonTextProperties, textNode, matchMethod, hierarchyEntry_1, targetClassifications, _loop_3, _d, targetClassifications_1, classification, state_1, hierarchyEntry_2, possibleNames, _loop_4, _e, possibleNames_1, targetName, state_2, fontError_1;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        if (!propValue || typeof propValue !== 'string' || !propValue.trim())
                                            return [2 /*return*/, "continue"];
                                        nonTextProperties = new Set([
                                            'horizontalSizing', 'variants', 'textStyle', 'colorStyleName',
                                            'leading-icon', 'trailing-icon', 'layoutAlign', 'layoutGrow'
                                        ]);
                                        if (nonTextProperties.has(propKey) || propKey.endsWith('Style') || propKey.includes('icon')) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        console.log("\uD83D\uDD27 Trying to set ".concat(propKey, " = \"").concat(propValue, "\""));
                                        textNode = null;
                                        matchMethod = 'none';
                                        // Method 1: Try exact node name match from scan data
                                        if (componentTextHierarchy) {
                                            hierarchyEntry_1 = componentTextHierarchy.find(function (entry) {
                                                return entry.nodeName.toLowerCase() === propKey.toLowerCase() ||
                                                    entry.nodeName.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase();
                                            });
                                            if (hierarchyEntry_1) {
                                                textNode = allTextNodes.find(function (n) { return n.id === hierarchyEntry_1.nodeId; }) || null;
                                                if (textNode) {
                                                    matchMethod = 'exact-name';
                                                    console.log("\u2705 Found text node by exact name match: \"".concat(textNode.name, "\" (").concat(hierarchyEntry_1.classification, ")"));
                                                }
                                                else {
                                                    // Enhanced fallback: match by name when ID fails (for nested components)
                                                    textNode = allTextNodes.find(function (n) { return n.name === hierarchyEntry_1.nodeName; }) || null;
                                                    if (textNode) {
                                                        matchMethod = 'name-fallback';
                                                        console.log("\u2705 Found text node by name fallback: \"".concat(textNode.name, "\" (ID mismatch resolved)"));
                                                    }
                                                }
                                            }
                                        }
                                        // Method 2: Try semantic classification match
                                        if (!textNode && componentTextHierarchy && semanticMappings[propKey.toLowerCase()]) {
                                            targetClassifications = semanticMappings[propKey.toLowerCase()];
                                            _loop_3 = function (classification) {
                                                var hierarchyEntry = componentTextHierarchy.find(function (entry) {
                                                    return entry.classification === classification;
                                                });
                                                if (hierarchyEntry) {
                                                    textNode = allTextNodes.find(function (n) { return n.id === hierarchyEntry.nodeId; }) || null;
                                                    if (textNode) {
                                                        matchMethod = 'semantic-classification';
                                                        console.log("\u2705 Found text node by semantic classification: \"".concat(textNode.name, "\" (").concat(classification, ")"));
                                                        return "break";
                                                    }
                                                    else {
                                                        // Enhanced fallback: match by name when ID fails (for nested components)
                                                        textNode = allTextNodes.find(function (n) { return n.name === hierarchyEntry.nodeName; }) || null;
                                                        if (textNode) {
                                                            matchMethod = 'semantic-name-fallback';
                                                            console.log("\u2705 Found text node by semantic name fallback: \"".concat(textNode.name, "\" (ID mismatch resolved)"));
                                                            return "break";
                                                        }
                                                    }
                                                }
                                            };
                                            for (_d = 0, targetClassifications_1 = targetClassifications; _d < targetClassifications_1.length; _d++) {
                                                classification = targetClassifications_1[_d];
                                                state_1 = _loop_3(classification);
                                                if (state_1 === "break")
                                                    break;
                                            }
                                        }
                                        // Method 3: Try partial node name match from scan data
                                        if (!textNode && componentTextHierarchy) {
                                            hierarchyEntry_2 = componentTextHierarchy.find(function (entry) {
                                                return entry.nodeName.toLowerCase().includes(propKey.toLowerCase()) ||
                                                    propKey.toLowerCase().includes(entry.nodeName.toLowerCase());
                                            });
                                            if (hierarchyEntry_2) {
                                                textNode = allTextNodes.find(function (n) { return n.id === hierarchyEntry_2.nodeId; }) || null;
                                                if (textNode) {
                                                    matchMethod = 'partial-name';
                                                    console.log("\u2705 Found text node by partial name match: \"".concat(textNode.name, "\""));
                                                }
                                                else {
                                                    // Enhanced fallback: match by name when ID fails (for nested components)
                                                    textNode = allTextNodes.find(function (n) { return n.name === hierarchyEntry_2.nodeName; }) || null;
                                                    if (textNode) {
                                                        matchMethod = 'partial-name-fallback';
                                                        console.log("\u2705 Found text node by partial name fallback: \"".concat(textNode.name, "\" (ID mismatch resolved)"));
                                                    }
                                                }
                                            }
                                        }
                                        // Method 4: Fallback to legacy name-based matching
                                        if (!textNode) {
                                            possibleNames = legacyMappings[propKey.toLowerCase()] || [propKey.toLowerCase()];
                                            _loop_4 = function (targetName) {
                                                textNode = allTextNodes.find(function (n) { return n.name.toLowerCase().includes(targetName.toLowerCase()); }) || null;
                                                if (textNode) {
                                                    matchMethod = 'legacy-mapping';
                                                    console.log("\u2705 Found text node by legacy mapping: \"".concat(textNode.name, "\""));
                                                    return "break";
                                                }
                                            };
                                            for (_e = 0, possibleNames_1 = possibleNames; _e < possibleNames_1.length; _e++) {
                                                targetName = possibleNames_1[_e];
                                                state_2 = _loop_4(targetName);
                                                if (state_2 === "break")
                                                    break;
                                            }
                                        }
                                        // Method 5: Position-based fallback
                                        if (!textNode) {
                                            if (propKey.toLowerCase().includes('headline') || propKey.toLowerCase().includes('title') || propKey.toLowerCase().includes('primary')) {
                                                textNode = allTextNodes[0] || null;
                                                matchMethod = 'position-first';
                                                console.log("\uD83D\uDD04 Using first text node as fallback for \"".concat(propKey, "\""));
                                            }
                                            else if (propKey.toLowerCase().includes('trailing') || propKey.toLowerCase().includes('tertiary')) {
                                                textNode = allTextNodes[allTextNodes.length - 1] || null;
                                                matchMethod = 'position-last';
                                                console.log("\uD83D\uDD04 Using last text node as fallback for \"".concat(propKey, "\""));
                                            }
                                            else if (propKey.toLowerCase().includes('supporting') || propKey.toLowerCase().includes('secondary')) {
                                                textNode = allTextNodes[1] || allTextNodes[0] || null;
                                                matchMethod = 'position-second';
                                                console.log("\uD83D\uDD04 Using second text node as fallback for \"".concat(propKey, "\""));
                                            }
                                        }
                                        if (!textNode) return [3 /*break*/, 6];
                                        _f.label = 1;
                                    case 1:
                                        _f.trys.push([1, 4, , 5]);
                                        // Activate hidden text node if needed
                                        if (!textNode.visible) {
                                            textNode.visible = true;
                                            console.log("\uD83D\uDC41\uFE0F Activated hidden text node: \"".concat(textNode.name, "\""));
                                        }
                                        if (!(typeof textNode.fontName !== 'symbol')) return [3 /*break*/, 3];
                                        return [4 /*yield*/, figma.loadFontAsync(textNode.fontName)];
                                    case 2:
                                        _f.sent();
                                        textNode.characters = propValue;
                                        console.log("\u2705 Successfully set \"".concat(textNode.name, "\" to \"").concat(propValue, "\" (method: ").concat(matchMethod, ")"));
                                        _f.label = 3;
                                    case 3: return [3 /*break*/, 5];
                                    case 4:
                                        fontError_1 = _f.sent();
                                        console.error("\u274C Font loading failed for \"".concat(textNode.name, "\":"), fontError_1);
                                        return [3 /*break*/, 5];
                                    case 5: return [3 /*break*/, 7];
                                    case 6:
                                        console.warn("\u274C No text node found for property \"".concat(propKey, "\" with value \"").concat(propValue, "\""));
                                        _f.label = 7;
                                    case 7: return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, _a = Object.entries(properties);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        _b = _a[_i], propKey = _b[0], propValue = _b[1];
                        return [5 /*yield**/, _loop_2(propKey, propValue)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get text hierarchy data for a component instance from scan results
     */
    FigmaRenderer.getComponentTextHierarchy = function (instance) {
        return __awaiter(this, void 0, void 0, function () {
            var mainComponent_1, scanResults, componentInfo, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, instance.getMainComponentAsync()];
                    case 1:
                        mainComponent_1 = _a.sent();
                        if (!mainComponent_1)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, figma.clientStorage.getAsync('last-scan-results')];
                    case 2:
                        scanResults = _a.sent();
                        if (!scanResults || !Array.isArray(scanResults))
                            return [2 /*return*/, null];
                        componentInfo = scanResults.find(function (comp) { return comp.id === mainComponent_1.id; });
                        return [2 /*return*/, (componentInfo === null || componentInfo === void 0 ? void 0 : componentInfo.textHierarchy) || null];
                    case 3:
                        error_4 = _a.sent();
                        console.warn("Could not get text hierarchy data:", error_4);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply media properties to component instances using enhanced scan data validation
     */
    FigmaRenderer.applyMediaProperties = function (instance, properties) {
        return __awaiter(this, void 0, void 0, function () {
            var componentMediaData, mediaPropertyPatterns, mediaProperties, _i, _a, _b, propKey, propValue, validationResult;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!properties)
                            return [2 /*return*/];
                        console.log("🖼️ Validating media properties:", properties);
                        return [4 /*yield*/, this.getComponentMediaData(instance)];
                    case 1:
                        componentMediaData = _d.sent();
                        console.log("🖼️ Media data from scan results:", componentMediaData);
                        mediaPropertyPatterns = [
                            'icon', 'image', 'avatar', 'photo', 'logo', 'media',
                            'leading-icon', 'trailing-icon', 'start-icon', 'end-icon',
                            'profile-image', 'user-avatar', 'cover-image', 'thumbnail'
                        ];
                        mediaProperties = {};
                        Object.entries(properties).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            var keyLower = key.toLowerCase();
                            if (mediaPropertyPatterns.some(function (pattern) { return keyLower.includes(pattern); })) {
                                mediaProperties[key] = value;
                            }
                        });
                        if (Object.keys(mediaProperties).length === 0) {
                            console.log("🖼️ No media properties found to validate");
                            return [2 /*return*/];
                        }
                        console.log("🖼️ Found media properties to validate:", Object.keys(mediaProperties));
                        // Validate each media property against scan data
                        for (_i = 0, _a = Object.entries(mediaProperties); _i < _a.length; _i++) {
                            _b = _a[_i], propKey = _b[0], propValue = _b[1];
                            if (!propValue || typeof propValue !== 'string' || !propValue.trim())
                                continue;
                            console.log("\uD83D\uDD0D Validating media property: ".concat(propKey, " = \"").concat(propValue, "\""));
                            validationResult = this.validateMediaProperty(propKey, propValue, componentMediaData);
                            if (validationResult.isValid) {
                                console.log("\u2705 ".concat(propKey, " \u2192 would set to \"").concat(propValue, "\" (").concat(validationResult.targetType, ": \"").concat(validationResult.targetName, "\")"));
                            }
                            else {
                                console.warn("\u274C Invalid media property: \"".concat(propKey, "\" = \"").concat(propValue, "\" - ").concat(validationResult.reason));
                                // Suggest alternatives if available
                                if ((_c = validationResult.suggestions) === null || _c === void 0 ? void 0 : _c.length) {
                                    console.log("\uD83D\uDCA1 Available media slots: ".concat(validationResult.suggestions.join(', ')));
                                }
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get media structure data for a component instance from scan results
     */
    FigmaRenderer.getComponentMediaData = function (instance) {
        return __awaiter(this, void 0, void 0, function () {
            var mainComponent_2, scanResults, componentInfo, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, instance.getMainComponentAsync()];
                    case 1:
                        mainComponent_2 = _a.sent();
                        if (!mainComponent_2) {
                            console.warn("Could not get main component from instance");
                            return [2 /*return*/, null];
                        }
                        console.log("🔍 Looking for media data for main component ID:", mainComponent_2.id);
                        return [4 /*yield*/, figma.clientStorage.getAsync('last-scan-results')];
                    case 2:
                        scanResults = _a.sent();
                        if (!scanResults || !Array.isArray(scanResults)) {
                            console.warn("No scan results found in storage");
                            return [2 /*return*/, null];
                        }
                        console.log("🔍 Available component IDs in scan data:", scanResults.map(function (c) { return c.id; }));
                        componentInfo = scanResults.find(function (comp) { return comp.id === mainComponent_2.id; });
                        if (!componentInfo) {
                            console.warn("Component ".concat(mainComponent_2.id, " not found in scan results"));
                            return [2 /*return*/, null];
                        }
                        console.log("🔍 Found component info:", componentInfo.name);
                        console.log("🔍 Component instances:", componentInfo.componentInstances);
                        console.log("🔍 Vector nodes:", componentInfo.vectorNodes);
                        console.log("🔍 Image nodes:", componentInfo.imageNodes);
                        return [2 /*return*/, {
                                componentInstances: componentInfo.componentInstances || [],
                                vectorNodes: componentInfo.vectorNodes || [],
                                imageNodes: componentInfo.imageNodes || []
                            }];
                    case 3:
                        error_5 = _a.sent();
                        console.warn("Could not get media data:", error_5);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate a media property against available media slots in scan data
     */
    FigmaRenderer.validateMediaProperty = function (propKey, propValue, mediaData) {
        if (!mediaData) {
            return {
                isValid: false,
                reason: "No media scan data available"
            };
        }
        var componentInstances = mediaData.componentInstances, vectorNodes = mediaData.vectorNodes, imageNodes = mediaData.imageNodes;
        // Create a list of all available media slots
        var allMediaSlots = __spreadArray(__spreadArray(__spreadArray([], componentInstances.map(function (c) { return ({ name: c.nodeName, type: 'component-instance' }); }), true), vectorNodes.map(function (v) { return ({ name: v.nodeName, type: 'vector-node' }); }), true), imageNodes.map(function (i) { return ({ name: i.nodeName, type: 'image-node' }); }), true);
        if (allMediaSlots.length === 0) {
            return {
                isValid: false,
                reason: "No media slots found in component"
            };
        }
        // Try exact name match
        var exactMatch = allMediaSlots.find(function (slot) {
            return slot.name.toLowerCase() === propKey.toLowerCase() ||
                slot.name.toLowerCase().replace(/\s+/g, '-') === propKey.toLowerCase();
        });
        if (exactMatch) {
            return {
                isValid: true,
                targetType: exactMatch.type,
                targetName: exactMatch.name
            };
        }
        // Try partial name match
        var partialMatch = allMediaSlots.find(function (slot) {
            return slot.name.toLowerCase().includes(propKey.toLowerCase()) ||
                propKey.toLowerCase().includes(slot.name.toLowerCase());
        });
        if (partialMatch) {
            return {
                isValid: true,
                targetType: partialMatch.type,
                targetName: partialMatch.name
            };
        }
        // Try semantic matching based on property type
        var semanticMatch = this.findSemanticMediaMatch(propKey, allMediaSlots);
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
            reason: "No matching media slot found for \"".concat(propKey, "\""),
            suggestions: allMediaSlots.map(function (slot) { return slot.name; })
        };
    };
    /**
     * Find semantic matches for media properties using intelligent classification
     */
    FigmaRenderer.findSemanticMediaMatch = function (propKey, mediaSlots) {
        var keyLower = propKey.toLowerCase();
        // Enhanced semantic classification with multiple strategies
        var classifications = this.classifyMediaSlots(mediaSlots);
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
            var positionMatch = this.findByPosition(mediaSlots, 'leading');
            if (positionMatch)
                return positionMatch;
            // Fallback to any icon/vector for leading positions
            return classifications.icons[0] || classifications.vectors[0] || null;
        }
        if (keyLower.includes('trailing') || keyLower.includes('end') || keyLower.includes('right')) {
            var positionMatch = this.findByPosition(mediaSlots, 'trailing');
            if (positionMatch)
                return positionMatch;
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
    };
    /**
     * Classify media slots into semantic categories based on names and types
     */
    FigmaRenderer.classifyMediaSlots = function (mediaSlots) {
        var classifications = {
            avatars: [],
            icons: [],
            images: [],
            vectors: [],
            badges: [],
            logos: [],
            smallImages: [],
            largeImages: [],
            circles: [],
            rectangularImages: []
        };
        mediaSlots.forEach(function (slot) {
            var nameLower = slot.name.toLowerCase();
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
                }
                else if (nameLower.includes('large') || nameLower.includes('big') || nameLower.includes('cover')) {
                    classifications.largeImages.push(slot);
                }
                // Shape classification
                if (nameLower.includes('circle') || nameLower.includes('round')) {
                    classifications.circles.push(slot);
                }
                else {
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
    };
    /**
     * Find media slots by position keywords
     */
    FigmaRenderer.findByPosition = function (mediaSlots, position) {
        var positionKeywords = position === 'leading'
            ? ['leading', 'start', 'left', 'first', 'begin']
            : ['trailing', 'end', 'right', 'last', 'final'];
        return mediaSlots.find(function (slot) {
            return positionKeywords.some(function (keyword) {
                return slot.name.toLowerCase().includes(keyword);
            });
        }) || null;
    };
    /**
     * Sanitize and clean property names and values
     */
    FigmaRenderer.sanitizeProperties = function (properties) {
        if (!properties)
            return {};
        return Object.entries(properties).reduce(function (acc, _a) {
            var key = _a[0], value = _a[1];
            var cleanKey = key.replace(/\s+/g, '-');
            if (key.toLowerCase().includes('text') && value !== null && value !== undefined) {
                acc[cleanKey] = String(value);
            }
            else {
                acc[cleanKey] = value;
            }
            return acc;
        }, {});
    };
    /**
     * Separate variant properties from regular properties
     */
    FigmaRenderer.separateVariantsFromProperties = function (properties, componentId) {
        if (!properties)
            return { cleanProperties: {}, variants: {} };
        var cleanProperties = {};
        var variants = {};
        var knownTextProperties = ['text', 'supporting-text', 'trailing-text', 'headline', 'subtitle', 'value'];
        var knownLayoutProperties = ['horizontalSizing', 'verticalSizing', 'layoutAlign', 'layoutGrow'];
        var variantPropertyNames = [
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
        Object.entries(properties).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            if (key === 'variants') {
                Object.assign(variants, value);
                console.log("\uD83D\uDD27 Found existing variants object:", value);
                return;
            }
            if (knownTextProperties.some(function (prop) { return key.toLowerCase().includes(prop.toLowerCase()); })) {
                cleanProperties[key] = value;
                return;
            }
            if (knownLayoutProperties.some(function (prop) { return key.toLowerCase().includes(prop.toLowerCase()); })) {
                cleanProperties[key] = value;
                return;
            }
            if (variantPropertyNames.includes(key)) {
                var properKey = key.charAt(0).toUpperCase() + key.slice(1);
                variants[properKey] = value;
                console.log("\uD83D\uDD27 Moved \"".concat(key, "\" -> \"").concat(properKey, "\" from properties to variants"));
                return;
            }
            cleanProperties[key] = value;
        });
        console.log("\uD83D\uDD0D Final separation for ".concat(componentId, ":"));
        console.log("   Clean properties:", cleanProperties);
        console.log("   Variants:", variants);
        return { cleanProperties: cleanProperties, variants: variants };
    };
    /**
     * Apply child layout properties for auto-layout items
     */
    FigmaRenderer.applyChildLayoutProperties = function (node, properties) {
        if (!properties)
            return;
        // layoutAlign - how the child aligns within its parent
        if (properties.layoutAlign) {
            node.layoutAlign = properties.layoutAlign;
        }
        else if (properties.horizontalSizing === 'FILL') {
            node.layoutAlign = 'STRETCH';
        }
        // layoutGrow - how much the child should grow to fill available space
        if (properties.layoutGrow !== undefined) {
            node.layoutGrow = properties.layoutGrow;
        }
        else if (properties.horizontalSizing === 'FILL') {
            var parent_1 = node.parent;
            if (parent_1 && 'layoutMode' in parent_1 && parent_1.layoutMode === 'HORIZONTAL') {
                node.layoutGrow = 1;
            }
        }
        // layoutPositioning - absolute positioning within auto-layout
        if (properties.layoutPositioning) {
            node.layoutPositioning = properties.layoutPositioning;
        }
        // Size constraints for child elements
        if (properties.minWidth !== undefined && 'minWidth' in node) {
            node.minWidth = properties.minWidth;
        }
        if (properties.maxWidth !== undefined && 'maxWidth' in node) {
            node.maxWidth = properties.maxWidth;
        }
        if (properties.minHeight !== undefined && 'minHeight' in node) {
            node.minHeight = properties.minHeight;
        }
        if (properties.maxHeight !== undefined && 'maxHeight' in node) {
            node.maxHeight = properties.maxHeight;
        }
    };
    /**
     * Enhanced systematic component creation with modern API
     */
    FigmaRenderer.createComponentInstanceSystematic = function (item, container) {
        return __awaiter(this, void 0, void 0, function () {
            var componentNode, masterComponent, allProperties, validationResult, llmErrors, _a, variants, textProperties, mediaProperties, layoutProperties, instance;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!item.componentNodeId)
                            return [2 /*return*/];
                        return [4 /*yield*/, figma.getNodeByIdAsync(item.componentNodeId)];
                    case 1:
                        componentNode = _b.sent();
                        if (!componentNode) {
                            console.warn("\u26A0\uFE0F Component with ID ".concat(item.componentNodeId, " not found. Skipping."));
                            return [2 /*return*/];
                        }
                        masterComponent = (componentNode.type === 'COMPONENT_SET'
                            ? componentNode.defaultVariant
                            : componentNode);
                        if (!masterComponent || masterComponent.type !== 'COMPONENT') {
                            console.warn("\u26A0\uFE0F Could not find a valid master component for ID ".concat(item.componentNodeId, ". Skipping."));
                            return [2 /*return*/];
                        }
                        console.log(" Creating systematic instance: ".concat(masterComponent.name));
                        allProperties = __assign(__assign({}, item.properties || {}), { variants: item.variants || {} });
                        validationResult = component_property_engine_1.ComponentPropertyEngine.validateAndProcessProperties(item.componentNodeId, allProperties);
                        if (validationResult.warnings.length > 0) {
                            console.warn("\u26A0\uFE0F Warnings:", validationResult.warnings);
                        }
                        if (validationResult.errors.length > 0) {
                            console.error("\u274C Validation errors:", validationResult.errors);
                            llmErrors = validationResult.errors.map(function (err) {
                                return "".concat(err.message).concat(err.suggestion ? " - ".concat(err.suggestion) : '').concat(err.llmHint ? " (".concat(err.llmHint, ")") : '');
                            }).join('\n');
                            console.error(" LLM Error Summary:\n".concat(llmErrors));
                        }
                        _a = validationResult.processedProperties, variants = _a.variants, textProperties = _a.textProperties, mediaProperties = _a.mediaProperties, layoutProperties = _a.layoutProperties;
                        console.log('🔧 VALIDATION RESULTS:', {
                            originalVariants: item.variants,
                            processedVariants: variants,
                            variantCount: Object.keys(variants).length
                        });
                        instance = masterComponent.createInstance();
                        container.appendChild(instance);
                        if (!(Object.keys(variants).length > 0)) return [3 /*break*/, 3];
                        console.log('✅ About to apply variants:', variants);
                        return [4 /*yield*/, this.applyVariantsSystematic(instance, variants, componentNode)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        console.log('⚠️ NO VARIANTS TO APPLY - variants object is empty');
                        _b.label = 4;
                    case 4:
                        // Apply visibility overrides after variants
                        this.applyVisibilityOverrides(instance, item);
                        this.applyChildLayoutProperties(instance, layoutProperties);
                        if (!(Object.keys(textProperties).length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.applyTextPropertiesSystematic(instance, textProperties, item.componentNodeId)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        if (!(Object.keys(mediaProperties).length > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.applyMediaPropertiesSystematic(instance, mediaProperties, item.componentNodeId)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply variants with modern Component Properties API
     */
    FigmaRenderer.applyVariantsSystematic = function (instance, variants, componentNode) {
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🎨 VARIANT APPLICATION START', {
                            variants: variants,
                            componentType: componentNode === null || componentNode === void 0 ? void 0 : componentNode.type,
                            instanceName: instance.name
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, component_property_engine_1.PerformanceTracker.track('apply-variants', function () { return __awaiter(_this, void 0, void 0, function () {
                                var propertyDefinitions_1, validVariants_2;
                                return __generator(this, function (_a) {
                                    if (componentNode && componentNode.type === 'COMPONENT_SET') {
                                        propertyDefinitions_1 = componentNode.componentPropertyDefinitions;
                                        if (!propertyDefinitions_1) {
                                            console.warn('⚠️ No component property definitions found');
                                            return [2 /*return*/];
                                        }
                                        validVariants_2 = {};
                                        Object.entries(variants).forEach(function (_a) {
                                            var _b;
                                            var propName = _a[0], propValue = _a[1];
                                            var propertyDef = propertyDefinitions_1[propName];
                                            if (propertyDef && propertyDef.type === 'VARIANT') {
                                                // Convert boolean values to capitalized strings for Figma
                                                var stringValue = void 0;
                                                if (typeof propValue === 'boolean') {
                                                    stringValue = propValue ? 'True' : 'False';
                                                    console.log("\uD83D\uDD04 Boolean conversion: ".concat(propName, " = ").concat(propValue, " -> \"").concat(stringValue, "\""));
                                                }
                                                else {
                                                    stringValue = String(propValue);
                                                }
                                                if (propertyDef.variantOptions && propertyDef.variantOptions.includes(stringValue)) {
                                                    validVariants_2[propName] = stringValue;
                                                    console.log("\u2705 Valid variant: ".concat(propName, " = \"").concat(stringValue, "\""));
                                                }
                                                else {
                                                    console.warn("\u26A0\uFE0F Invalid value for \"".concat(propName, "\": \"").concat(stringValue, "\". Available: [").concat(((_b = propertyDef.variantOptions) === null || _b === void 0 ? void 0 : _b.join(', ')) || '', "]"));
                                                }
                                            }
                                            else {
                                                console.warn("\u26A0\uFE0F Unknown variant property: \"".concat(propName, "\""));
                                            }
                                        });
                                        if (Object.keys(validVariants_2).length > 0) {
                                            instance.setProperties(validVariants_2);
                                            console.log('✅ Variants applied successfully');
                                        }
                                    }
                                    return [2 /*return*/];
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        console.error("❌ Error applying variants:", e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply visibility overrides to component child elements
     */
    FigmaRenderer.applyVisibilityOverrides = function (instance, itemData) {
        console.log('🐛 applyVisibilityOverrides CALLED', {
            hasOverrides: !!itemData.visibilityOverrides,
            hasIconSwaps: !!itemData.iconSwaps,
            overrideCount: Object.keys(itemData.visibilityOverrides || {}).length,
            iconSwapCount: Object.keys(itemData.iconSwaps || {}).length,
            instanceName: instance.name,
            instanceId: instance.id,
            itemType: itemData.type
        });
        if (!itemData.visibilityOverrides && !itemData.iconSwaps) {
            console.log('🐛 No overrides to apply, returning early');
            return;
        }
        // Log all instance children for debugging
        console.log('🐛 Instance children:', instance.children.map(function (child) { return ({
            name: child.name,
            id: child.id,
            type: child.type,
            visible: child.visible
        }); }));
        try {
            // Apply visibility overrides
            if (itemData.visibilityOverrides) {
                console.log('🐛 Processing visibility overrides:', itemData.visibilityOverrides);
                Object.entries(itemData.visibilityOverrides).forEach(function (_a) {
                    var nodeId = _a[0], visible = _a[1];
                    console.log("\uD83D\uDC1B Looking for node ".concat(nodeId, " to set visibility to ").concat(visible));
                    var child = instance.findChild(function (node) { return node.id === nodeId; });
                    if (child) {
                        var previousVisible = child.visible;
                        child.visible = visible;
                        console.log("\u2705 Applied visibility override: ".concat(nodeId, " = ").concat(visible, " (was: ").concat(previousVisible, ", name: ").concat(child.name, ")"));
                    }
                    else {
                        console.warn("\u26A0\uFE0F Child node ".concat(nodeId, " not found for visibility override"));
                        console.warn("\uD83D\uDC1B Available node IDs:", instance.children.map(function (c) { return c.id; }));
                    }
                });
            }
            // Apply icon swaps (simplified - extend based on icon system)
            if (itemData.iconSwaps) {
                console.log('🐛 Processing icon swaps:', itemData.iconSwaps);
                Object.entries(itemData.iconSwaps).forEach(function (_a) {
                    var nodeId = _a[0], iconName = _a[1];
                    console.log("\uD83D\uDC1B Looking for node ".concat(nodeId, " to swap icon to ").concat(iconName));
                    var child = instance.findChild(function (node) { return node.id === nodeId; });
                    if (child && 'componentProperties' in child) {
                        // Attempt to swap icon - implementation depends on icon component structure
                        console.log("\uD83D\uDD04 Icon swap requested: ".concat(nodeId, " \u2192 ").concat(iconName, " (child: ").concat(child.name, ")"));
                        // Note: Actual icon swapping implementation would depend on the specific design system
                    }
                    else {
                        console.warn("\u26A0\uFE0F Child node ".concat(nodeId, " not found or not suitable for icon swap"));
                        if (child) {
                            console.warn("\uD83D\uDC1B Child found but no componentProperties: ".concat(child.name, ", type: ").concat(child.type));
                        }
                    }
                });
            }
            console.log('🐛 applyVisibilityOverrides completed successfully');
        }
        catch (error) {
            console.error('❌ Visibility override application failed:', error);
        }
    };
    /**
     * Apply text properties with proper font loading and array support
     */
    FigmaRenderer.applyTextPropertiesSystematic = function (instance, textProperties, componentId) {
        return __awaiter(this, void 0, void 0, function () {
            var schema, allTextNodes, _loop_5, this_2, _i, _a, _b, propKey, propValue;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log(" Applying text properties systematically:", textProperties);
                        schema = component_property_engine_1.ComponentPropertyEngine.getComponentSchema(componentId);
                        if (!!schema) return [3 /*break*/, 2];
                        console.warn("\u26A0\uFE0F No schema found for component ".concat(componentId, ", using fallback text application"));
                        // Fallback to original method
                        return [4 /*yield*/, this.applyTextProperties(instance, textProperties)];
                    case 1:
                        // Fallback to original method
                        _c.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, component_property_engine_1.PerformanceTracker.track('find-text-nodes', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, instance.findAllWithCriteria({ types: ['TEXT'] })];
                        }); }); })];
                    case 3:
                        allTextNodes = _c.sent();
                        _loop_5 = function (propKey, propValue) {
                            var textLayerInfo, semanticMatch, matchedName, matchedInfo, valueToUse, valueToUse;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        textLayerInfo = schema.textLayers[propKey];
                                        if (!!textLayerInfo) return [3 /*break*/, 5];
                                        console.warn("\u26A0\uFE0F No text layer info found for property \"".concat(propKey, "\""));
                                        semanticMatch = Object.entries(schema.textLayers).find(function (_a) {
                                            var layerName = _a[0], info = _a[1];
                                            var layerLower = layerName.toLowerCase();
                                            var propLower = propKey.toLowerCase();
                                            return layerLower.includes(propLower) || propLower.includes(layerLower);
                                        });
                                        if (!semanticMatch) return [3 /*break*/, 4];
                                        matchedName = semanticMatch[0], matchedInfo = semanticMatch[1];
                                        console.log(" Using semantic match: \"".concat(propKey, "\" \u2192 \"").concat(matchedName, "\""));
                                        if (!(matchedInfo.dataType === 'array' && Array.isArray(propValue))) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this_2.applyArrayTextProperty(propKey, propValue, allTextNodes, matchedInfo)];
                                    case 1:
                                        _d.sent();
                                        return [3 /*break*/, 4];
                                    case 2:
                                        valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
                                        return [4 /*yield*/, this_2.applySingleTextProperty(propKey, valueToUse, allTextNodes, matchedInfo)];
                                    case 3:
                                        _d.sent();
                                        _d.label = 4;
                                    case 4: return [2 /*return*/, "continue"];
                                    case 5:
                                        if (!(textLayerInfo.dataType === 'array' && Array.isArray(propValue))) return [3 /*break*/, 7];
                                        return [4 /*yield*/, this_2.applyArrayTextProperty(propKey, propValue, allTextNodes, textLayerInfo)];
                                    case 6:
                                        _d.sent();
                                        return [3 /*break*/, 9];
                                    case 7:
                                        valueToUse = Array.isArray(propValue) ? propValue[0] : propValue;
                                        return [4 /*yield*/, this_2.applySingleTextProperty(propKey, valueToUse, allTextNodes, textLayerInfo)];
                                    case 8:
                                        _d.sent();
                                        _d.label = 9;
                                    case 9: return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _i = 0, _a = Object.entries(textProperties);
                        _c.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        _b = _a[_i], propKey = _b[0], propValue = _b[1];
                        return [5 /*yield**/, _loop_5(propKey, propValue)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply array text property (for tabs, chips, etc.)
     */
    FigmaRenderer.applyArrayTextProperty = function (propKey, propValues, allTextNodes, textLayerInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var matchingNodes, maxItems, i, textNode, value, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log(" Applying array text property ".concat(propKey, ":"), propValues);
                        matchingNodes = allTextNodes.filter(function (node) {
                            var nodeLower = node.name.toLowerCase();
                            var layerLower = textLayerInfo.nodeName.toLowerCase();
                            var propLower = propKey.toLowerCase();
                            return nodeLower === layerLower ||
                                nodeLower.includes(propLower) ||
                                nodeLower === propLower;
                        });
                        maxItems = Math.min(propValues.length, textLayerInfo.maxItems || propValues.length);
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < maxItems && i < matchingNodes.length)) return [3 /*break*/, 4];
                        textNode = matchingNodes[i];
                        value = propValues[i];
                        if (!(value && typeof value === 'string' && value.trim())) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.setTextNodeValueSafe(textNode, value, "".concat(propKey, "[").concat(i, "]"))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Hide extra nodes if we have fewer values than nodes
                        for (i = maxItems; i < matchingNodes.length; i++) {
                            matchingNodes[i].visible = false;
                            console.log("\uFE0F Hidden extra text node: \"".concat(matchingNodes[i].name, "\""));
                        }
                        console.log("\u2705 Applied ".concat(maxItems, " values to ").concat(propKey, " array property"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply single text property
     */
    FigmaRenderer.applySingleTextProperty = function (propKey, propValue, allTextNodes, textLayerInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var textNode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!propValue || typeof propValue !== 'string' || !propValue.trim())
                            return [2 /*return*/];
                        textNode = allTextNodes.find(function (n) { return n.id === textLayerInfo.nodeId; });
                        if (!textNode) {
                            // Try exact name match
                            textNode = allTextNodes.find(function (n) {
                                return n.name.toLowerCase() === textLayerInfo.nodeName.toLowerCase();
                            });
                        }
                        if (!textNode) {
                            // Try fuzzy name match
                            textNode = allTextNodes.find(function (n) {
                                var nodeLower = n.name.toLowerCase();
                                var layerLower = textLayerInfo.nodeName.toLowerCase();
                                return nodeLower.includes(layerLower) || layerLower.includes(nodeLower);
                            });
                        }
                        if (!textNode) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.setTextNodeValueSafe(textNode, propValue, propKey)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        console.warn("\u274C No text node found for property \"".concat(propKey, "\" (looking for \"").concat(textLayerInfo.nodeName, "\")"));
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Apply media properties systematically
     */
    FigmaRenderer.applyMediaPropertiesSystematic = function (instance, mediaProperties, componentId) {
        return __awaiter(this, void 0, void 0, function () {
            var schema, allMediaNodes, _loop_6, _i, _a, _b, propKey, propValue;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("️ Applying media properties systematically:", mediaProperties);
                        schema = component_property_engine_1.ComponentPropertyEngine.getComponentSchema(componentId);
                        if (!schema) {
                            console.warn("\u26A0\uFE0F No schema found for component ".concat(componentId, ", skipping media application"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, component_property_engine_1.PerformanceTracker.track('find-media-nodes', function () { return __awaiter(_this, void 0, void 0, function () {
                                var vectors, rectangles, ellipses, components;
                                return __generator(this, function (_a) {
                                    vectors = instance.findAllWithCriteria({ types: ['VECTOR'] });
                                    rectangles = instance.findAllWithCriteria({ types: ['RECTANGLE'] });
                                    ellipses = instance.findAllWithCriteria({ types: ['ELLIPSE'] });
                                    components = instance.findAllWithCriteria({ types: ['INSTANCE', 'COMPONENT'] });
                                    return [2 /*return*/, __spreadArray(__spreadArray(__spreadArray(__spreadArray([], vectors, true), rectangles, true), ellipses, true), components, true)];
                                });
                            }); })];
                    case 1:
                        allMediaNodes = _c.sent();
                        _loop_6 = function (propKey, propValue) {
                            var mediaLayerInfo = schema.mediaLayers[propKey];
                            if (!mediaLayerInfo) {
                                console.warn("\u26A0\uFE0F No media layer info found for property \"".concat(propKey, "\""));
                                return "continue";
                            }
                            // Find matching node
                            var mediaNode = allMediaNodes.find(function (n) { return n.id === mediaLayerInfo.nodeId; }) ||
                                allMediaNodes.find(function (n) { return n.name.toLowerCase() === mediaLayerInfo.nodeName.toLowerCase(); });
                            if (mediaNode) {
                                console.log("\u2705 Found media node for \"".concat(propKey, "\": \"").concat(mediaNode.name, "\" (").concat(mediaNode.type, ")"));
                                // Future: Apply actual media content here (swap instances, change fills, etc.)
                            }
                            else {
                                console.warn("\u274C No media node found for property \"".concat(propKey, "\""));
                            }
                        };
                        for (_i = 0, _a = Object.entries(mediaProperties); _i < _a.length; _i++) {
                            _b = _a[_i], propKey = _b[0], propValue = _b[1];
                            _loop_6(propKey, propValue);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Safe text setting with proper font loading
     */
    FigmaRenderer.setTextNodeValueSafe = function (textNode, value, context) {
        return __awaiter(this, void 0, void 0, function () {
            var fontError_2, fallbackError_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 7]);
                        return [4 /*yield*/, component_property_engine_1.PerformanceTracker.track('set-text-value', function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            // Critical: Check for missing fonts first
                                            if (textNode.hasMissingFont) {
                                                console.error("\u274C Cannot set text \"".concat(context, "\": Missing fonts"));
                                                return [2 /*return*/];
                                            }
                                            if (!textNode.visible) {
                                                textNode.visible = true;
                                            }
                                            // Load all required fonts properly
                                            return [4 /*yield*/, this.loadAllRequiredFonts(textNode)];
                                        case 1:
                                            // Load all required fonts properly
                                            _a.sent();
                                            textNode.characters = value;
                                            console.log("\u2705 Set \"".concat(textNode.name, "\" to \"").concat(value, "\" (").concat(context, ")"));
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 2:
                        fontError_2 = _a.sent();
                        console.error("\u274C Font loading failed for \"".concat(textNode.name, "\":"), fontError_2);
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, figma.loadFontAsync({ family: "Inter", style: "Regular" })];
                    case 4:
                        _a.sent();
                        textNode.fontName = { family: "Inter", style: "Regular" };
                        textNode.characters = value;
                        console.log("\u26A0\uFE0F Used fallback font for \"".concat(textNode.name, "\""));
                        return [3 /*break*/, 6];
                    case 5:
                        fallbackError_1 = _a.sent();
                        console.error("\u274C Even fallback failed:", fallbackError_1);
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Load all fonts required for a text node (handles mixed fonts)
     */
    FigmaRenderer.loadAllRequiredFonts = function (textNode) {
        return __awaiter(this, void 0, void 0, function () {
            var allFonts, uniqueFonts_1, fontPromises, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        if (!(typeof textNode.fontName !== 'symbol')) return [3 /*break*/, 2];
                        return [4 /*yield*/, figma.loadFontAsync(textNode.fontName)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(textNode.fontName === figma.mixed && textNode.characters.length > 0)) return [3 /*break*/, 4];
                        allFonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
                        uniqueFonts_1 = new Map();
                        allFonts.forEach(function (font) {
                            uniqueFonts_1.set("".concat(font.family, "-").concat(font.style), font);
                        });
                        fontPromises = Array.from(uniqueFonts_1.values()).map(function (font) {
                            return figma.loadFontAsync(font);
                        });
                        return [4 /*yield*/, Promise.all(fontPromises)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_6 = _a.sent();
                        throw error_6; // Will be handled by calling function
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Enhanced dynamic generation using systematic approach
     */
    FigmaRenderer.generateUIFromDataSystematic = function (layoutData, parentNode) {
        return __awaiter(this, void 0, void 0, function () {
            var schemas, currentFrame, containerData, debugData, debugContent, blob, url, a, frameState, items, _i, items_3, item, nestedFrame, nestedFrame, postProcessContainerData, perfReport, error_7, fallbackFrame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 15, , 16]);
                        console.log('🔧 Starting generateUIFromDataSystematic with data:', {
                            hasLayoutContainer: !!layoutData.layoutContainer,
                            hasItems: !!layoutData.items,
                            parentType: parentNode.type
                        });
                        schemas = component_property_engine_1.ComponentPropertyEngine.getAllSchemas();
                        if (schemas.length === 0) {
                            console.log('⚠️ No schemas - running systematic generation in basic mode');
                        }
                        currentFrame = void 0;
                        containerData = layoutData.layoutContainer || layoutData;
                        debugData = {
                            timestamp: new Date().toISOString(),
                            inputData: layoutData,
                            containerData: containerData,
                            parentNodeType: parentNode.type
                        };
                        console.log('📁 FULL INPUT DATA FOR DEBUGGING:', JSON.stringify(debugData, null, 2));
                        // Create downloadable debug file
                        try {
                            debugContent = JSON.stringify(debugData, null, 2);
                            blob = new Blob([debugContent], { type: 'application/json' });
                            url = URL.createObjectURL(blob);
                            a = document.createElement('a');
                            a.href = url;
                            a.download = 'debug-renderer-input.json';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            console.log('💾 Debug file auto-downloaded as: debug-renderer-input.json');
                        }
                        catch (e) {
                            console.warn('⚠️ Could not auto-download debug file:', e.message);
                            console.log('📋 Copy this JSON manually:', JSON.stringify(debugData, null, 2));
                        }
                        console.log('🔍 INPUT DATA:', {
                            containerData: containerData,
                            hasWidth: !!(containerData === null || containerData === void 0 ? void 0 : containerData.width),
                            widthValue: containerData === null || containerData === void 0 ? void 0 : containerData.width
                        });
                        if (parentNode.type === 'PAGE' && containerData) {
                            currentFrame = figma.createFrame();
                            currentFrame.resize(containerData.width || 800, containerData.height || 600);
                            parentNode.appendChild(currentFrame);
                        }
                        else if (parentNode.type === 'FRAME') {
                            currentFrame = parentNode;
                        }
                        else {
                            figma.notify("Cannot add items without a parent frame.", { error: true });
                            return [2 /*return*/, figma.createFrame()];
                        }
                        // Apply container properties
                        // DEBUG LOG 2: Container condition check
                        console.log('🔍 CONTAINER CONDITION:', {
                            hasContainerData: !!containerData,
                            containerEqualsLayout: containerData === layoutData,
                            conditionPassed: !!(containerData && containerData !== layoutData)
                        });
                        if (containerData) {
                            currentFrame.name = containerData.name || "Generated Frame";
                            console.log('🔧 Applying container properties:', {
                                name: containerData.name,
                                layoutMode: containerData.layoutMode,
                                itemSpacing: containerData.itemSpacing,
                                primaryAxisSizingMode: containerData.primaryAxisSizingMode,
                                width: containerData.width,
                                hasWidth: !!containerData.width
                            });
                            try {
                                currentFrame.layoutMode = containerData.layoutMode === "HORIZONTAL" || containerData.layoutMode === "VERTICAL"
                                    ? containerData.layoutMode : "NONE";
                                console.log('🔧 Frame layoutMode set to:', currentFrame.layoutMode);
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set layoutMode:', e.message);
                            }
                            if (currentFrame.layoutMode !== 'NONE') {
                                try {
                                    currentFrame.paddingTop = typeof containerData.paddingTop === 'number' ? containerData.paddingTop : 0;
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set paddingTop:', e.message);
                                }
                                try {
                                    currentFrame.paddingBottom = typeof containerData.paddingBottom === 'number' ? containerData.paddingBottom : 0;
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set paddingBottom:', e.message);
                                }
                                try {
                                    currentFrame.paddingLeft = typeof containerData.paddingLeft === 'number' ? containerData.paddingLeft : 0;
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set paddingLeft:', e.message);
                                }
                                try {
                                    currentFrame.paddingRight = typeof containerData.paddingRight === 'number' ? containerData.paddingRight : 0;
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set paddingRight:', e.message);
                                }
                                // Enhanced auto-layout properties
                                try {
                                    if (containerData.itemSpacing === 'AUTO') {
                                        currentFrame.itemSpacing = 'AUTO';
                                    }
                                    else {
                                        currentFrame.itemSpacing = typeof containerData.itemSpacing === 'number' ? containerData.itemSpacing : 0;
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set itemSpacing:', e.message);
                                }
                                // Layout wrap support
                                try {
                                    if (containerData.layoutWrap !== undefined) {
                                        currentFrame.layoutWrap = containerData.layoutWrap;
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set layoutWrap:', e.message);
                                }
                                // Primary axis alignment
                                try {
                                    if (containerData.primaryAxisAlignItems) {
                                        currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set primaryAxisAlignItems:', e.message);
                                }
                                // Counter axis alignment
                                try {
                                    if (containerData.counterAxisAlignItems) {
                                        currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set counterAxisAlignItems:', e.message);
                                }
                                // Sizing modes - Skip primaryAxisSizingMode here if we have explicit width
                                // (it will be set to FIXED later in the width setting block)
                                console.log('🔍 EARLY CHECK:', {
                                    hasWidth: !!containerData.width,
                                    widthValue: containerData.width,
                                    skipEarlySetting: !containerData.width
                                });
                                if (!containerData.width || containerData.width === 0) {
                                    try {
                                        if (containerData.primaryAxisSizingMode) {
                                            currentFrame.primaryAxisSizingMode = containerData.primaryAxisSizingMode;
                                            console.log('🔍 Set primaryAxisSizingMode early:', containerData.primaryAxisSizingMode);
                                        }
                                    }
                                    catch (e) {
                                        console.warn('⚠️ Failed to set primaryAxisSizingMode:', e.message);
                                    }
                                }
                                else {
                                    console.log('🔍 SKIPPED early primaryAxisSizingMode setting (has width)');
                                }
                                try {
                                    if (containerData.counterAxisSizingMode) {
                                        currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode;
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set counterAxisSizingMode:', e.message);
                                }
                            }
                            // Size constraints - wrapped in try-catch to prevent property setter errors
                            try {
                                if (containerData.minWidth !== undefined) {
                                    currentFrame.minWidth = containerData.minWidth;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set minWidth:', e.message);
                            }
                            try {
                                if (containerData.maxWidth !== undefined) {
                                    currentFrame.maxWidth = containerData.maxWidth;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set maxWidth:', e.message);
                            }
                            try {
                                if (containerData.minHeight !== undefined) {
                                    currentFrame.minHeight = containerData.minHeight;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set minHeight:', e.message);
                            }
                            try {
                                if (containerData.maxHeight !== undefined) {
                                    currentFrame.maxHeight = containerData.maxHeight;
                                }
                            }
                            catch (e) {
                                console.warn('⚠️ Failed to set maxHeight:', e.message);
                            }
                            if (containerData.width) {
                                try {
                                    if (currentFrame.layoutMode !== 'NONE') {
                                        // DEBUG LOG 3: Before width setting
                                        console.log('🔍 BEFORE width set:', {
                                            specified: containerData.width,
                                            current: currentFrame.width,
                                            layoutMode: currentFrame.layoutMode
                                        });
                                        // CRITICAL: Set sizing modes BEFORE width
                                        // When setting explicit width, primaryAxisSizingMode must be FIXED
                                        currentFrame.primaryAxisSizingMode = "FIXED";
                                        currentFrame.counterAxisSizingMode = containerData.counterAxisSizingMode || "FIXED";
                                        frameState = {
                                            primaryAxis: currentFrame.primaryAxisSizingMode,
                                            counterAxis: currentFrame.counterAxisSizingMode,
                                            layoutMode: currentFrame.layoutMode,
                                            currentWidth: currentFrame.width
                                        };
                                        console.log('🔍 FRAME STATE before width:', frameState);
                                        console.log('📋 FRAME STATE for file:', JSON.stringify(frameState, null, 2));
                                        currentFrame.width = containerData.width;
                                        // DEBUG LOG 4: After width setting
                                        console.log('🔍 AFTER width set:', currentFrame.width);
                                        console.log('🔧 Set auto-layout frame width to:', containerData.width);
                                    }
                                    else {
                                        // For regular frames, use resize
                                        currentFrame.resize(containerData.width, currentFrame.height);
                                        console.log('🔧 Resized regular frame to width:', containerData.width);
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set width:', e.message);
                                }
                            }
                            else {
                                try {
                                    if (!containerData.counterAxisSizingMode) {
                                        currentFrame.counterAxisSizingMode = "AUTO";
                                    }
                                }
                                catch (e) {
                                    console.warn('⚠️ Failed to set counterAxisSizingMode (AUTO):', e.message);
                                }
                            }
                        }
                        items = layoutData.items || containerData.items;
                        if (!items || !Array.isArray(items))
                            return [2 /*return*/, currentFrame];
                        _i = 0, items_3 = items;
                        _a.label = 1;
                    case 1:
                        if (!(_i < items_3.length)) return [3 /*break*/, 14];
                        item = items_3[_i];
                        if (!(item.type === 'layoutContainer')) return [3 /*break*/, 3];
                        console.log('🔧 Creating nested layoutContainer:', item.name, 'layoutMode:', item.layoutMode);
                        nestedFrame = figma.createFrame();
                        currentFrame.appendChild(nestedFrame);
                        // Apply child layout properties
                        this.applyChildLayoutProperties(nestedFrame, item);
                        return [4 /*yield*/, this.generateUIFromDataSystematic({ layoutContainer: item, items: item.items }, nestedFrame)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 3:
                        if (!(item.type === 'frame' && item.layoutContainer)) return [3 /*break*/, 5];
                        nestedFrame = figma.createFrame();
                        currentFrame.appendChild(nestedFrame);
                        return [4 /*yield*/, this.generateUIFromDataSystematic(item, nestedFrame)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 5:
                        if (!(item.type === 'native-text' || item.type === 'text')) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.createTextNode(item, currentFrame)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 7:
                        if (!(item.type === 'native-rectangle')) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.createRectangleNode(item, currentFrame)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 9:
                        if (!(item.type === 'native-circle')) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.createEllipseNode(item, currentFrame)];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 11: 
                    // Use systematic approach for components
                    return [4 /*yield*/, this.createComponentInstanceSystematic(item, currentFrame)];
                    case 12:
                        // Use systematic approach for components
                        _a.sent();
                        _a.label = 13;
                    case 13:
                        _i++;
                        return [3 /*break*/, 1];
                    case 14:
                        postProcessContainerData = layoutData.layoutContainer || layoutData;
                        if (postProcessContainerData && postProcessContainerData.width && currentFrame.layoutMode !== 'NONE') {
                            console.log('🔧 Post-processing: Re-enforcing frame width to:', postProcessContainerData.width);
                            currentFrame.width = postProcessContainerData.width;
                        }
                        if (parentNode.type === 'PAGE') {
                            figma.currentPage.selection = [currentFrame];
                            figma.viewport.scrollAndZoomIntoView([currentFrame]);
                            perfReport = component_property_engine_1.ComponentPropertyEngine.getPerformanceReport();
                            console.log("⚡ Performance Report:", perfReport);
                            figma.notify("UI generated with systematic validation!", { timeout: 2500 });
                        }
                        return [2 /*return*/, currentFrame];
                    case 15:
                        error_7 = _a.sent();
                        console.error('❌ generateUIFromDataSystematic error:', error_7);
                        console.error('❌ Error details:', {
                            message: error_7.message,
                            stack: error_7.stack,
                            name: error_7.name,
                            layoutData: layoutData,
                            parentNodeType: parentNode.type
                        });
                        fallbackFrame = figma.createFrame();
                        fallbackFrame.name = "Error Frame";
                        fallbackFrame.resize(375, 100);
                        if (parentNode.type === 'PAGE') {
                            parentNode.appendChild(fallbackFrame);
                        }
                        figma.notify("\u274C Error creating UI: ".concat(error_7.message), { error: true });
                        return [2 /*return*/, fallbackFrame];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Modify existing UI frame by replacing its content
     */
    FigmaRenderer.modifyExistingUI = function (modifiedJSON, frameId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingFrame, i, e_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, figma.getNodeByIdAsync(frameId)];
                    case 1:
                        existingFrame = _a.sent();
                        if (!(existingFrame && existingFrame.type === 'FRAME')) return [3 /*break*/, 3];
                        // Remove all existing children
                        for (i = existingFrame.children.length - 1; i >= 0; i--) {
                            existingFrame.children[i].remove();
                        }
                        // Generate new content
                        return [4 /*yield*/, this.generateUIFromData(modifiedJSON, existingFrame)];
                    case 2:
                        // Generate new content
                        _a.sent();
                        figma.notify("UI updated successfully!", { timeout: 2000 });
                        return [2 /*return*/, existingFrame];
                    case 3: throw new Error("Target frame for modification not found.");
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        e_3 = _a.sent();
                        errorMessage = e_3 instanceof Error ? e_3.message : String(e_3);
                        figma.notify("Modification error: " + errorMessage, { error: true });
                        console.error("❌ modifyExistingUI error:", e_3);
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure color styles are loaded before UI generation
     */
    FigmaRenderer.ensureColorStylesLoaded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var scanSession, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.cachedColorStyles) return [3 /*break*/, 5];
                        console.log('🎨 Color styles not cached, attempting to load from storage...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, session_manager_1.SessionManager.loadLastScanSession()];
                    case 2:
                        scanSession = _a.sent();
                        if (scanSession === null || scanSession === void 0 ? void 0 : scanSession.colorStyles) {
                            this.setColorStyles(scanSession.colorStyles);
                            console.log('✅ Color styles loaded from scan session');
                        }
                        else {
                            console.warn('⚠️ No color styles found in storage. Run a design system scan first.');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_4 = _a.sent();
                        console.warn('⚠️ Failed to load color styles from storage:', e_4);
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        console.log('✅ Color styles already cached');
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure design tokens are loaded before UI generation
     */
    FigmaRenderer.ensureDesignTokensLoaded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var scanSession, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.cachedDesignTokens) return [3 /*break*/, 5];
                        console.log('🔧 Design tokens not cached, attempting to load from storage...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, session_manager_1.SessionManager.loadLastScanSession()];
                    case 2:
                        scanSession = _a.sent();
                        if (scanSession === null || scanSession === void 0 ? void 0 : scanSession.designTokens) {
                            this.setDesignTokens(scanSession.designTokens);
                            console.log('✅ Design tokens loaded from scan session');
                        }
                        else {
                            console.warn('⚠️ No design tokens found in storage. Run a design system scan first.');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_5 = _a.sent();
                        console.warn('⚠️ Failed to load design tokens from storage:', e_5);
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        console.log('✅ Design tokens already cached');
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure all cached design system data is loaded (color styles, text styles, design tokens)
     */
    FigmaRenderer.ensureDesignSystemDataLoaded = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureColorStylesLoaded()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.ensureDesignTokensLoaded()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize Color Styles from a scan session
     */
    FigmaRenderer.setColorStyles = function (colorStyles) {
        this.cachedColorStyles = colorStyles;
        if (colorStyles) {
            var totalStyles = Object.values(colorStyles).reduce(function (sum, styles) { return sum + styles.length; }, 0);
            console.log("\uD83C\uDFA8 FigmaRenderer: Loaded ".concat(totalStyles, " Color Styles for semantic color resolution"));
        }
    };
    /**
     * NEW: Set cached design tokens for renderer to use
     */
    FigmaRenderer.setDesignTokens = function (designTokens) {
        this.cachedDesignTokens = designTokens;
        console.log("\uD83D\uDD27 Cached ".concat((designTokens === null || designTokens === void 0 ? void 0 : designTokens.length) || 0, " design tokens for renderer"));
    };
    /**
     * NEW: Resolve design token names to RGB values
     * Supports various token naming patterns: 'button.primary', 'color-primary-500', 'Primary/500'
     */
    FigmaRenderer.resolveDesignTokenReference = function (tokenName) {
        if (!this.cachedDesignTokens || this.cachedDesignTokens.length === 0) {
            return null;
        }
        console.log("\uD83D\uDD27 Resolving design token: \"".concat(tokenName, "\""));
        // Find exact match first
        var exactMatch = this.cachedDesignTokens.find(function (token) {
            return token.type === 'COLOR' && token.name === tokenName;
        });
        if (exactMatch) {
            console.log("\u2705 Found exact design token: ".concat(exactMatch.name));
            return this.convertTokenValueToRgb(exactMatch.value);
        }
        // Try case-insensitive match
        var caseInsensitiveMatch = this.cachedDesignTokens.find(function (token) {
            return token.type === 'COLOR' && token.name.toLowerCase() === tokenName.toLowerCase();
        });
        if (caseInsensitiveMatch) {
            console.log("\u2705 Found case-insensitive design token: ".concat(caseInsensitiveMatch.name));
            return this.convertTokenValueToRgb(caseInsensitiveMatch.value);
        }
        // Try pattern matching: 'collection/name' format
        var collectionMatch = this.cachedDesignTokens.find(function (token) {
            return token.type === 'COLOR' && "".concat(token.collection, "/").concat(token.name).toLowerCase() === tokenName.toLowerCase();
        });
        if (collectionMatch) {
            console.log("\u2705 Found collection-based design token: ".concat(collectionMatch.collection, "/").concat(collectionMatch.name));
            return this.convertTokenValueToRgb(collectionMatch.value);
        }
        console.warn("\u26A0\uFE0F Could not find design token \"".concat(tokenName, "\""));
        return null;
    };
    /**
     * NEW: Convert design token value to RGB
     */
    FigmaRenderer.convertTokenValueToRgb = function (tokenValue) {
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
            console.warn("\u26A0\uFE0F Unsupported token value format:", tokenValue);
            return null;
        }
        catch (error) {
            console.error("\u274C Error converting token value:", error);
            return null;
        }
    };
    /**
     * Resolve color style names to actual Figma color styles (for style application)
     * Returns the actual Figma PaintStyle object so styles are applied, not raw colors
     */
    FigmaRenderer.resolveColorStyleReference = function (colorStyleName) {
        return __awaiter(this, void 0, void 0, function () {
            var localPaintStyles, exactMatch, caseInsensitiveMatch, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83C\uDFA8 Resolving color style reference: \"".concat(colorStyleName, "\""));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, figma.getLocalPaintStylesAsync()];
                    case 2:
                        localPaintStyles = _a.sent();
                        console.log("\uD83D\uDCCB Found ".concat(localPaintStyles.length, " local paint styles in Figma"));
                        // Debug: Show first few style names
                        if (localPaintStyles.length > 0) {
                            console.log("\uD83D\uDCCB First 5 style names:", localPaintStyles.slice(0, 5).map(function (s) { return s.name; }));
                        }
                        exactMatch = localPaintStyles.find(function (style) { return style.name === colorStyleName; });
                        if (exactMatch) {
                            console.log("\u2705 Found exact color style: ".concat(exactMatch.name));
                            return [2 /*return*/, exactMatch];
                        }
                        caseInsensitiveMatch = localPaintStyles.find(function (style) {
                            return style.name.toLowerCase() === colorStyleName.toLowerCase();
                        });
                        if (caseInsensitiveMatch) {
                            console.log("\u2705 Found case-insensitive color style: ".concat(caseInsensitiveMatch.name));
                            return [2 /*return*/, caseInsensitiveMatch];
                        }
                        console.warn("\u26A0\uFE0F Could not find color style \"".concat(colorStyleName, "\""));
                        console.log("\uD83D\uDCCB All available paint styles:", localPaintStyles.map(function (s) { return s.name; }));
                        return [2 /*return*/, null];
                    case 3:
                        error_8 = _a.sent();
                        console.error("\u274C Error resolving color style \"".concat(colorStyleName, "\":"), error_8);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ENHANCED: Resolve color references with 3-tier fallback system
     * 1. Design Tokens (preferred)
     * 2. Color Styles (legacy)
     * 3. Semantic color fallback
     */
    FigmaRenderer.resolveColorReference = function (colorName) {
        console.log("\uD83C\uDFA8 Resolving color: \"".concat(colorName, "\" with 3-tier system"));
        // Tier 1: Try design tokens first (modern approach)
        var tokenColor = this.resolveDesignTokenReference(colorName);
        if (tokenColor) {
            console.log("\u2705 Resolved via design token");
            return tokenColor;
        }
        // Tier 2: Fallback to color styles (legacy approach)
        var styleColor = this.resolveSemanticColor(colorName);
        if (styleColor && !(styleColor.r === 0 && styleColor.g === 0 && styleColor.b === 0)) {
            console.log("\u2705 Resolved via color style");
            return styleColor;
        }
        // Tier 3: Ultimate fallback
        console.warn("\u26A0\uFE0F Could not resolve color \"".concat(colorName, "\" through any method"));
        return { r: 0, g: 0, b: 0 }; // Black fallback
    };
    /**
     * Resolve color style names to actual RGB values from scanned Color Styles (fallback)
     * Uses exact name matching from design system scan data
     * Examples: "Primary/primary80", "Button-color", "Light Green", "ui-primary-500"
     */
    FigmaRenderer.resolveSemanticColor = function (colorStyleName) {
        if (!this.cachedColorStyles) {
            console.warn("\u26A0\uFE0F No Color Styles loaded. Call setColorStyles() first or run a design system scan.");
            return null;
        }
        console.log("\uD83C\uDFA8 Resolving color style: \"".concat(colorStyleName, "\""));
        // Search all categories for exact name match
        var allCategories = Object.values(this.cachedColorStyles).flat();
        var exactMatch = allCategories.find(function (style) { return style.name === colorStyleName; });
        if (exactMatch && exactMatch.colorInfo.type === 'SOLID') {
            console.log("\u2705 Found exact match: ".concat(exactMatch.name, " (").concat(exactMatch.colorInfo.color, ")"));
            return this.hexToRgb(exactMatch.colorInfo.color || '#000000');
        }
        // Fallback: case-insensitive search
        var caseInsensitiveMatch = allCategories.find(function (style) {
            return style.name.toLowerCase() === colorStyleName.toLowerCase();
        });
        if (caseInsensitiveMatch && caseInsensitiveMatch.colorInfo.type === 'SOLID') {
            console.log("\u2705 Found case-insensitive match: ".concat(caseInsensitiveMatch.name, " (").concat(caseInsensitiveMatch.colorInfo.color, ")"));
            return this.hexToRgb(caseInsensitiveMatch.colorInfo.color || '#000000');
        }
        console.warn("\u26A0\uFE0F Could not find color style \"".concat(colorStyleName, "\""));
        console.log("Available color styles:", allCategories.map(function (s) { return s.name; }));
        // Return black as fallback
        return { r: 0, g: 0, b: 0 };
    };
    /**
     * Convert hex color to RGB values (0-1 range)
     */
    FigmaRenderer.hexToRgb = function (hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        // Handle 3-digit hex codes
        if (hex.length === 3) {
            hex = hex.split('').map(function (char) { return char + char; }).join('');
        }
        var r = parseInt(hex.substr(0, 2), 16) / 255;
        var g = parseInt(hex.substr(2, 2), 16) / 255;
        var b = parseInt(hex.substr(4, 2), 16) / 255;
        return { r: r, g: g, b: b };
    };
    /**
     * Create a solid paint from RGB values
     */
    FigmaRenderer.createSolidPaint = function (rgb, opacity) {
        if (opacity === void 0) { opacity = 1; }
        return {
            type: 'SOLID',
            color: rgb,
            opacity: opacity
        };
    };
    /**
     * Helper method to resolve and apply semantic colors to text nodes
     */
    FigmaRenderer.applySemanticTextColor = function (textNode, semanticColorName) {
        var rgb = this.resolveColorReference(semanticColorName);
        if (rgb) {
            textNode.fills = [this.createSolidPaint(rgb)];
            console.log("\u2705 Applied semantic color \"".concat(semanticColorName, "\" to text node"));
            return true;
        }
        return false;
    };
    /**
     * Helper method to resolve and apply color styles to any node with fills
     */
    FigmaRenderer.applySemanticFillColor = function (node, semanticColorName) {
        return __awaiter(this, void 0, void 0, function () {
            var colorStyle, rgb;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveColorStyleReference(semanticColorName)];
                    case 1:
                        colorStyle = _a.sent();
                        if (!(colorStyle && 'setFillStyleIdAsync' in node)) return [3 /*break*/, 3];
                        return [4 /*yield*/, node.setFillStyleIdAsync(colorStyle.id)];
                    case 2:
                        _a.sent();
                        console.log("\u2705 Applied color style \"".concat(semanticColorName, "\" to node (as style reference)"));
                        return [2 /*return*/, true];
                    case 3:
                        rgb = this.resolveColorReference(semanticColorName);
                        if (rgb && 'fills' in node) {
                            node.fills = [this.createSolidPaint(rgb)];
                            console.log("\u2705 Applied semantic fill color \"".concat(semanticColorName, "\" to node (as RGB fallback)"));
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                }
            });
        });
    };
    // Text Styles Caching and Resolution
    /**
     * Sets the cached text styles for the renderer
     * Mirrors setColorStyles pattern exactly
     */
    FigmaRenderer.setTextStyles = function (textStyles) {
        FigmaRenderer.cachedTextStyles = textStyles;
        console.log("\uD83D\uDCDD Cached ".concat(textStyles.length, " text styles for rendering"));
        // Log available text styles for debugging
        if (textStyles.length > 0) {
            console.log('Available text styles:', textStyles.map(function (s) { return s.name; }).join(', '));
        }
    };
    /**
     * Resolves text style name to Figma text style ID
     * Mirrors resolveColorStyleReference pattern
     */
    FigmaRenderer.resolveTextStyleReference = function (textStyleName) {
        return __awaiter(this, void 0, void 0, function () {
            var localTextStyles, exactMatch, caseInsensitiveMatch, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83D\uDCDD Resolving text style reference: \"".concat(textStyleName, "\""));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, figma.getLocalTextStylesAsync()];
                    case 2:
                        localTextStyles = _a.sent();
                        console.log("\uD83D\uDCCB Found ".concat(localTextStyles.length, " local text styles in Figma"));
                        // Debug: Show first few style names
                        if (localTextStyles.length > 0) {
                            console.log("\uD83D\uDCCB First 5 text style names:", localTextStyles.slice(0, 5).map(function (s) { return s.name; }));
                        }
                        exactMatch = localTextStyles.find(function (style) { return style.name === textStyleName; });
                        if (exactMatch) {
                            console.log("\u2705 Found exact text style: ".concat(exactMatch.name));
                            return [2 /*return*/, exactMatch];
                        }
                        caseInsensitiveMatch = localTextStyles.find(function (style) {
                            return style.name.toLowerCase() === textStyleName.toLowerCase();
                        });
                        if (caseInsensitiveMatch) {
                            console.log("\u2705 Found case-insensitive text style: ".concat(caseInsensitiveMatch.name));
                            return [2 /*return*/, caseInsensitiveMatch];
                        }
                        console.warn("\u26A0\uFE0F Could not find text style \"".concat(textStyleName, "\""));
                        console.log("\uD83D\uDCCB All available text styles:", localTextStyles.map(function (s) { return s.name; }));
                        return [2 /*return*/, null];
                    case 3:
                        error_9 = _a.sent();
                        console.error("\u274C Error resolving text style \"".concat(textStyleName, "\":"), error_9);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Applies text style to a text node
     */
    FigmaRenderer.applyTextStyle = function (textNode, textStyleName) {
        return __awaiter(this, void 0, void 0, function () {
            var textStyle, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        console.log("\uD83D\uDCDD Attempting to apply text style: \"".concat(textStyleName, "\""));
                        return [4 /*yield*/, FigmaRenderer.resolveTextStyleReference(textStyleName)];
                    case 1:
                        textStyle = _a.sent();
                        if (!textStyle) return [3 /*break*/, 3];
                        console.log("\uD83D\uDCDD Text style found - ID: ".concat(textStyle.id, ", Name: ").concat(textStyle.name));
                        return [4 /*yield*/, textNode.setTextStyleIdAsync(textStyle.id)];
                    case 2:
                        _a.sent();
                        console.log("\u2705 Applied text style \"".concat(textStyleName, "\" to text node"));
                        return [3 /*break*/, 4];
                    case 3:
                        console.warn("\u274C Could not apply text style \"".concat(textStyleName, "\" - style not found"));
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_10 = _a.sent();
                        console.error("\u274C Error applying text style \"".concat(textStyleName, "\":"), error_10);
                        console.error("\u274C Error details:", {
                            errorMessage: error_10.message,
                            errorStack: error_10.stack,
                            textStyleName: textStyleName,
                            textNodeType: textNode === null || textNode === void 0 ? void 0 : textNode.type,
                            textNodeId: textNode === null || textNode === void 0 ? void 0 : textNode.id
                        });
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Static storage for Color Styles scanned from the design system
    FigmaRenderer.cachedColorStyles = null;
    FigmaRenderer.cachedDesignTokens = null; // NEW: Design tokens cache
    // Static storage for Text Styles scanned from the design system
    FigmaRenderer.cachedTextStyles = null;
    return FigmaRenderer;
}());
exports.FigmaRenderer = FigmaRenderer;
