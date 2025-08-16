"use strict";
// src/core/component-property-engine.ts
// Systematic component property validation and processing engine
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentPropertyEngine = exports.PerformanceTracker = void 0;
var TabComponentHandler = /** @class */ (function () {
    function TabComponentHandler() {
    }
    TabComponentHandler.prototype.preprocessProperties = function (properties) {
        // Ensure Label is treated as array
        if (properties.Label && !Array.isArray(properties.Label)) {
            properties.Label = [properties.Label];
        }
        return properties;
    };
    TabComponentHandler.prototype.postProcessInstance = function (instance, properties) {
        // Tab-specific post-processing if needed
    };
    TabComponentHandler.prototype.getVariantPurpose = function (variantName) {
        var purposes = {
            'Type': 'layout behavior (Fixed vs Scrollable)',
            'Style': 'visual emphasis (Primary vs Secondary)',
            'Configuration': 'content structure (Label-only vs Label & Icon)'
        };
        return purposes[variantName] || 'component appearance';
    };
    return TabComponentHandler;
}());
var ChipComponentHandler = /** @class */ (function () {
    function ChipComponentHandler() {
    }
    ChipComponentHandler.prototype.preprocessProperties = function (properties) {
        if (properties.label && !Array.isArray(properties.label)) {
            properties.label = [properties.label];
        }
        return properties;
    };
    ChipComponentHandler.prototype.postProcessInstance = function (instance, properties) {
        // Chip-specific handling
    };
    ChipComponentHandler.prototype.getVariantPurpose = function (variantName) {
        return 'chip appearance and behavior';
    };
    return ChipComponentHandler;
}());
var PerformanceTracker = /** @class */ (function () {
    function PerformanceTracker() {
    }
    PerformanceTracker.track = function (operation, fn) {
        return __awaiter(this, void 0, void 0, function () {
            var start, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, fn()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        duration = Date.now() - start;
                        if (!PerformanceTracker.metrics.has(operation)) {
                            PerformanceTracker.metrics.set(operation, []);
                        }
                        PerformanceTracker.metrics.get(operation).push(duration);
                        console.log("\u23F1\uFE0F ".concat(operation, ": ").concat(duration.toFixed(2), "ms"));
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PerformanceTracker.getReport = function () {
        var report = {};
        PerformanceTracker.metrics.forEach(function (durations, operation) {
            report[operation] = {
                avg: durations.reduce(function (a, b) { return a + b; }, 0) / durations.length,
                min: Math.min.apply(Math, durations),
                max: Math.max.apply(Math, durations)
            };
        });
        return report;
    };
    PerformanceTracker.metrics = new Map();
    return PerformanceTracker;
}());
exports.PerformanceTracker = PerformanceTracker;
// ===== MAIN ENGINE CLASS =====
var ComponentPropertyEngine = /** @class */ (function () {
    function ComponentPropertyEngine() {
    }
    ComponentPropertyEngine.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, PerformanceTracker.track('engine-initialization', function () { return __awaiter(_this, void 0, void 0, function () {
                                var scanResults, _i, scanResults_1, component, schema;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            // Enable performance optimization
                                            figma.skipInvisibleInstanceChildren = true;
                                            // Preload common fonts
                                            return [4 /*yield*/, ComponentPropertyEngine.preloadCommonFonts()];
                                        case 1:
                                            // Preload common fonts
                                            _a.sent();
                                            return [4 /*yield*/, figma.clientStorage.getAsync('last-scan-results')];
                                        case 2:
                                            scanResults = _a.sent();
                                            if (!scanResults || !Array.isArray(scanResults)) {
                                                console.warn("⚠️ No scan results found. Run ComponentScanner.scanDesignSystem() first.");
                                                return [2 /*return*/];
                                            }
                                            _i = 0, scanResults_1 = scanResults;
                                            _a.label = 3;
                                        case 3:
                                            if (!(_i < scanResults_1.length)) return [3 /*break*/, 6];
                                            component = scanResults_1[_i];
                                            return [4 /*yield*/, ComponentPropertyEngine.buildComponentSchemaFromScanData(component)];
                                        case 4:
                                            schema = _a.sent();
                                            ComponentPropertyEngine.componentSchemas.set(component.id, schema);
                                            console.log("\uD83D\uDCCB Loaded schema for ".concat(schema.name, " (").concat(schema.id, ")"));
                                            _a.label = 5;
                                        case 5:
                                            _i++;
                                            return [3 /*break*/, 3];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        console.log("\uD83C\uDFAF ComponentPropertyEngine initialized with ".concat(ComponentPropertyEngine.componentSchemas.size, " component schemas"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("❌ Failed to initialize ComponentPropertyEngine:", error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ComponentPropertyEngine.preloadCommonFonts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var commonFonts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (ComponentPropertyEngine.commonFontsLoaded)
                            return [2 /*return*/];
                        commonFonts = [
                            { family: "Inter", style: "Regular" },
                            { family: "Inter", style: "Medium" },
                            { family: "Inter", style: "Bold" },
                            { family: "Roboto", style: "Regular" },
                            { family: "Roboto", style: "Medium" },
                            { family: "Roboto", style: "Bold" },
                        ];
                        return [4 /*yield*/, Promise.all(commonFonts.map(function (font) {
                                return figma.loadFontAsync(font).catch(function () {
                                    console.warn("\u26A0\uFE0F Could not preload font: ".concat(font.family, " ").concat(font.style));
                                });
                            }))];
                    case 1:
                        _a.sent();
                        ComponentPropertyEngine.commonFontsLoaded = true;
                        console.log("✅ Common fonts preloaded");
                        return [2 /*return*/];
                }
            });
        });
    };
    ComponentPropertyEngine.buildComponentSchemaFromScanData = function (scanData) {
        return __awaiter(this, void 0, void 0, function () {
            var componentProperties, availableVariants, componentNode, propertyDefs, error_2, textLayers, mediaLayers;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        componentProperties = {};
                        availableVariants = {};
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, figma.getNodeByIdAsync(scanData.id)];
                    case 2:
                        componentNode = _a.sent();
                        if (componentNode && componentNode.type === 'COMPONENT_SET') {
                            propertyDefs = componentNode.componentPropertyDefinitions;
                            if (propertyDefs) {
                                componentProperties = propertyDefs;
                                // Extract variant properties from modern API
                                Object.entries(propertyDefs).forEach(function (_a) {
                                    var key = _a[0], definition = _a[1];
                                    if (definition.type === 'VARIANT' && definition.variantOptions) {
                                        availableVariants[key] = definition.variantOptions;
                                    }
                                });
                            }
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        // Fallback to scan data
                        if (scanData.variantDetails) {
                            Object.entries(scanData.variantDetails).forEach(function (_a) {
                                var key = _a[0], values = _a[1];
                                availableVariants[key] = Array.isArray(values) ? values : [values];
                            });
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        textLayers = {};
                        if (scanData.textHierarchy && Array.isArray(scanData.textHierarchy)) {
                            scanData.textHierarchy.forEach(function (textInfo) {
                                var dataType = _this.inferTextDataType(scanData.suggestedType, textInfo.nodeName);
                                textLayers[textInfo.nodeName] = {
                                    nodeId: textInfo.nodeId,
                                    nodeName: textInfo.nodeName,
                                    classification: textInfo.classification || 'secondary',
                                    dataType: dataType,
                                    maxItems: dataType === 'array' ? _this.inferMaxItems(scanData.suggestedType, textInfo.nodeName) : undefined,
                                    fontSize: textInfo.fontSize,
                                    fontWeight: textInfo.fontWeight
                                };
                            });
                        }
                        mediaLayers = {};
                        [scanData.componentInstances, scanData.vectorNodes, scanData.imageNodes].forEach(function (nodeArray) {
                            if (nodeArray) {
                                nodeArray.forEach(function (node) {
                                    mediaLayers[node.nodeName] = {
                                        nodeId: node.nodeId,
                                        nodeName: node.nodeName,
                                        mediaType: _this.inferMediaType(node.nodeName),
                                        dataType: 'single',
                                        visible: node.visible
                                    };
                                });
                            }
                        });
                        return [2 /*return*/, {
                                id: scanData.id,
                                name: scanData.name,
                                availableVariants: availableVariants,
                                componentProperties: componentProperties,
                                textLayers: textLayers,
                                mediaLayers: mediaLayers,
                                componentType: scanData.suggestedType || 'unknown',
                                scanTimestamp: Date.now(),
                                scanVersion: "1.1",
                                componentHash: "hash_" + Date.now().toString(36)
                            }];
                }
            });
        });
    };
    ComponentPropertyEngine.generateComponentHash = function (scanData) {
        var _a, _b;
        // Simple hash based on component structure
        var hashData = JSON.stringify({
            variants: scanData.variants,
            textLayers: (_a = scanData.textLayers) === null || _a === void 0 ? void 0 : _a.length,
            componentInstances: (_b = scanData.componentInstances) === null || _b === void 0 ? void 0 : _b.length
        });
        // Simple hash function for Figma environment (btoa may not be available)
        try {
            return btoa(hashData).substring(0, 8);
        }
        catch (e) {
            // Fallback: simple string hash
            var hash = 0;
            for (var i = 0; i < hashData.length; i++) {
                var char = hashData.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16).substring(0, 8);
        }
    };
    ComponentPropertyEngine.inferTextDataType = function (componentType, layerName) {
        var layerLower = layerName.toLowerCase();
        // Components that support arrays
        var arrayPatterns = {
            'tab': ['label'], 'tabs': ['label'],
            'chip': ['label', 'text'],
            'list': ['item', 'option', 'choice'],
            'navigation': ['label', 'text'],
            'menu': ['item', 'option', 'label'],
            'breadcrumb': ['item', 'label'],
            'carousel': ['caption', 'title']
        };
        var componentPatterns = arrayPatterns[componentType];
        if (componentPatterns) {
            var supportsArray = componentPatterns.some(function (pattern) { return layerLower.includes(pattern); });
            if (supportsArray)
                return 'array';
        }
        return 'single';
    };
    ComponentPropertyEngine.inferMaxItems = function (componentType, layerName) {
        var maxItemsMap = {
            'tab': 8, 'tabs': 8,
            'navigation': 6,
            'chip': 10,
            'list': 50,
            'menu': 20,
            'breadcrumb': 5,
            'carousel': 10
        };
        return maxItemsMap[componentType] || 10;
    };
    ComponentPropertyEngine.inferMediaType = function (nodeName) {
        var nameLower = nodeName.toLowerCase();
        if (nameLower.includes('avatar') || nameLower.includes('profile'))
            return 'avatar';
        if (nameLower.includes('badge') || nameLower.includes('indicator'))
            return 'badge';
        if (nameLower.includes('image') || nameLower.includes('photo'))
            return 'image';
        return 'icon';
    };
    ComponentPropertyEngine.validateAndProcessProperties = function (componentId, rawProperties) {
        var _this = this;
        console.log('🔍 PROPERTY ENGINE - Schema lookup:', {
            componentId: componentId,
            rawProperties: rawProperties,
            hasSchema: this.componentSchemas.has(componentId),
            totalSchemas: this.componentSchemas.size,
            allSchemaIds: Array.from(this.componentSchemas.keys())
        });
        var schema = this.componentSchemas.get(componentId);
        if (!schema) {
            return {
                isValid: false,
                processedProperties: { variants: {}, textProperties: {}, mediaProperties: {}, layoutProperties: {} },
                warnings: [],
                errors: [{
                        message: "No schema found for component ".concat(componentId),
                        suggestion: 'Ensure design system has been scanned',
                        llmHint: 'Run ComponentScanner.scanDesignSystem() first'
                    }]
            };
        }
        // Apply component-specific preprocessing
        var handler = this.componentHandlers.get(schema.componentType);
        var processedRawProperties = handler ?
            handler.preprocessProperties(__assign({}, rawProperties)) :
            rawProperties;
        var result = {
            isValid: true,
            processedProperties: { variants: {}, textProperties: {}, mediaProperties: {}, layoutProperties: {} },
            warnings: [],
            errors: []
        };
        // Process each property intelligently
        Object.entries(processedRawProperties).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            // Skip the 'variants' object itself if present
            if (key === 'variants' && typeof value === 'object') {
                Object.entries(value).forEach(function (_a) {
                    var variantKey = _a[0], variantValue = _a[1];
                    result.processedProperties.variants[variantKey] = variantValue;
                });
                return;
            }
            // Check if it's a variant (modern API first, then legacy)
            if (schema.componentProperties[key] || schema.availableVariants[key]) {
                result.processedProperties.variants[key] = value;
            }
            // Check if it's a text property
            else if (schema.textLayers[key]) {
                result.processedProperties.textProperties[key] = value;
            }
            // Check if it's a media property
            else if (schema.mediaLayers[key]) {
                result.processedProperties.mediaProperties[key] = value;
            }
            // Check if it's a layout property
            else if (['horizontalSizing', 'verticalSizing', 'layoutAlign', 'layoutGrow',
                'minWidth', 'maxWidth', 'minHeight', 'maxHeight'].some(function (prop) {
                return key.toLowerCase().includes(prop.toLowerCase());
            })) {
                result.processedProperties.layoutProperties[key] = value;
            }
            // Try semantic matching
            else {
                var textMatch = _this.findSemanticMatch(key, Object.keys(schema.textLayers));
                var variantMatch = _this.findSemanticMatch(key, Object.keys(schema.availableVariants));
                var mediaMatch = _this.findSemanticMatch(key, Object.keys(schema.mediaLayers));
                if (textMatch) {
                    result.processedProperties.textProperties[textMatch] = value;
                    result.warnings.push("Mapped \"".concat(key, "\" to text layer \"").concat(textMatch, "\""));
                }
                else if (variantMatch) {
                    result.processedProperties.variants[variantMatch] = value;
                    result.warnings.push("Mapped \"".concat(key, "\" to variant \"").concat(variantMatch, "\""));
                }
                else if (mediaMatch) {
                    result.processedProperties.mediaProperties[mediaMatch] = value;
                    result.warnings.push("Mapped \"".concat(key, "\" to media layer \"").concat(mediaMatch, "\""));
                }
                else {
                    result.warnings.push("Unknown property \"".concat(key, "\" for component ").concat(schema.name));
                }
            }
        });
        // Validate variants
        Object.entries(result.processedProperties.variants).forEach(function (_a) {
            var variantName = _a[0], variantValue = _a[1];
            var modernProp = schema.componentProperties[variantName];
            var legacyValues = schema.availableVariants[variantName];
            if (modernProp && modernProp.type === 'VARIANT') {
                if (!modernProp.variantOptions.includes(String(variantValue))) {
                    var variantPurpose = handler ? handler.getVariantPurpose(variantName) : 'component appearance';
                    result.errors.push({
                        message: "Invalid value \"".concat(variantValue, "\" for variant \"").concat(variantName, "\""),
                        suggestion: "Use one of: ".concat(modernProp.variantOptions.map(function (v) { return "\"".concat(v, "\""); }).join(', ')),
                        jsonPath: "properties.".concat(variantName),
                        llmHint: "For ".concat(schema.componentType, " components, ").concat(variantName, " controls ").concat(variantPurpose)
                    });
                }
            }
            else if (legacyValues) {
                if (!legacyValues.includes(String(variantValue))) {
                    var variantPurpose = handler ? handler.getVariantPurpose(variantName) : 'component appearance';
                    result.errors.push({
                        message: "Invalid value \"".concat(variantValue, "\" for variant \"").concat(variantName, "\""),
                        suggestion: "Use one of: ".concat(legacyValues.map(function (v) { return "\"".concat(v, "\""); }).join(', ')),
                        jsonPath: "properties.".concat(variantName),
                        llmHint: "For ".concat(schema.componentType, " components, ").concat(variantName, " controls ").concat(variantPurpose)
                    });
                }
            }
        });
        // Validate text properties
        Object.entries(result.processedProperties.textProperties).forEach(function (_a) {
            var textProp = _a[0], value = _a[1];
            var textLayer = schema.textLayers[textProp];
            if (textLayer && textLayer.dataType === 'array' && !Array.isArray(value)) {
                result.warnings.push("Property \"".concat(textProp, "\" expects array but got ").concat(typeof value, ". Converting to array."));
                result.processedProperties.textProperties[textProp] = [value];
            }
        });
        result.isValid = result.errors.length === 0;
        return result;
    };
    ComponentPropertyEngine.findSemanticMatch = function (propertyKey, availableKeys) {
        var keyLower = propertyKey.toLowerCase();
        // Direct fuzzy matching
        for (var _i = 0, availableKeys_1 = availableKeys; _i < availableKeys_1.length; _i++) {
            var availableKey = availableKeys_1[_i];
            var availableLower = availableKey.toLowerCase();
            // Exact match (case insensitive)
            if (availableLower === keyLower)
                return availableKey;
            // Remove common separators and compare
            var normalizedKey = keyLower.replace(/[-_\s]/g, '');
            var normalizedAvailable = availableLower.replace(/[-_\s]/g, '');
            if (normalizedAvailable === normalizedKey)
                return availableKey;
            // Partial matches
            if (availableLower.includes(keyLower) || keyLower.includes(availableLower)) {
                return availableKey;
            }
        }
        // Semantic equivalents
        var semanticMap = {
            'text': ['label', 'title', 'headline', 'content'],
            'label': ['text', 'title', 'headline'],
            'supporting': ['subtitle', 'description', 'secondary'],
            'trailing': ['end', 'right', 'action'],
            'leading': ['start', 'left', 'icon'],
        };
        for (var _a = 0, _b = Object.entries(semanticMap); _a < _b.length; _a++) {
            var _c = _b[_a], semantic = _c[0], equivalents = _c[1];
            if (keyLower.includes(semantic)) {
                var _loop_1 = function (equivalent) {
                    var match = availableKeys.find(function (k) { return k.toLowerCase().includes(equivalent); });
                    if (match)
                        return { value: match };
                };
                for (var _d = 0, equivalents_1 = equivalents; _d < equivalents_1.length; _d++) {
                    var equivalent = equivalents_1[_d];
                    var state_1 = _loop_1(equivalent);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            }
        }
        return null;
    };
    ComponentPropertyEngine.getComponentSchema = function (componentId) {
        return ComponentPropertyEngine.componentSchemas.get(componentId) || null;
    };
    ComponentPropertyEngine.getAllSchemas = function () {
        return Array.from(ComponentPropertyEngine.componentSchemas.values());
    };
    ComponentPropertyEngine.isSchemaStale = function (schema) {
        var staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        return Date.now() - schema.scanTimestamp > staleThreshold;
    };
    ComponentPropertyEngine.debugSchema = function (componentId) {
        var schema = this.getComponentSchema(componentId);
        if (schema) {
            console.log("\uD83D\uDCCB Schema for ".concat(schema.name, ":"));
            console.log("  🎯 Variants:", Object.keys(schema.availableVariants));
            console.log("  📝 Text Layers:", Object.keys(schema.textLayers));
            Object.entries(schema.textLayers).forEach(function (_a) {
                var name = _a[0], info = _a[1];
                console.log("    - ".concat(name, ": ").concat(info.dataType).concat(info.maxItems ? " (max: ".concat(info.maxItems, ")") : ''));
            });
            console.log("  🖼️ Media Layers:", Object.keys(schema.mediaLayers));
            console.log("  📅 Scanned:", new Date(schema.scanTimestamp).toLocaleString());
            console.log("  🔢 Version:", schema.scanVersion);
        }
        else {
            console.log("\u274C No schema found for component ".concat(componentId));
        }
    };
    ComponentPropertyEngine.createSchemaDebugFrame = function (componentId) {
        return __awaiter(this, void 0, void 0, function () {
            var schema, debugFrame, yPos, title, variantsTitle, textTitle;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        schema = this.getComponentSchema(componentId);
                        if (!schema)
                            return [2 /*return*/];
                        debugFrame = figma.createFrame();
                        debugFrame.name = "Debug: ".concat(schema.name);
                        debugFrame.resize(400, 600);
                        debugFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
                        return [4 /*yield*/, figma.loadFontAsync({ family: "Inter", style: "Bold" })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, figma.loadFontAsync({ family: "Inter", style: "Regular" })];
                    case 2:
                        _a.sent();
                        yPos = 20;
                        title = figma.createText();
                        title.fontName = { family: "Inter", style: "Bold" };
                        title.fontSize = 18;
                        title.characters = "".concat(schema.name, " (").concat(schema.componentType, ")");
                        title.x = 20;
                        title.y = yPos;
                        debugFrame.appendChild(title);
                        yPos += 40;
                        // Variants section
                        if (Object.keys(schema.availableVariants).length > 0) {
                            variantsTitle = figma.createText();
                            variantsTitle.fontName = { family: "Inter", style: "Bold" };
                            variantsTitle.fontSize = 14;
                            variantsTitle.characters = "🎯 Variants:";
                            variantsTitle.x = 20;
                            variantsTitle.y = yPos;
                            debugFrame.appendChild(variantsTitle);
                            yPos += 25;
                            Object.entries(schema.availableVariants).forEach(function (_a) {
                                var name = _a[0], values = _a[1];
                                var variantText = figma.createText();
                                variantText.fontName = { family: "Inter", style: "Regular" };
                                variantText.fontSize = 12;
                                variantText.characters = "".concat(name, ": [").concat(values.join(', '), "]");
                                variantText.x = 30;
                                variantText.y = yPos;
                                debugFrame.appendChild(variantText);
                                yPos += 20;
                            });
                            yPos += 10;
                        }
                        // Text layers section
                        if (Object.keys(schema.textLayers).length > 0) {
                            textTitle = figma.createText();
                            textTitle.fontName = { family: "Inter", style: "Bold" };
                            textTitle.fontSize = 14;
                            textTitle.characters = "📝 Text Layers:";
                            textTitle.x = 20;
                            textTitle.y = yPos;
                            debugFrame.appendChild(textTitle);
                            yPos += 25;
                            Object.entries(schema.textLayers).forEach(function (_a) {
                                var name = _a[0], info = _a[1];
                                var layerText = figma.createText();
                                layerText.fontName = { family: "Inter", style: "Regular" };
                                layerText.fontSize = 12;
                                layerText.characters = "".concat(name, ": ").concat(info.dataType).concat(info.maxItems ? " (max: ".concat(info.maxItems, ")") : '', " - ").concat(info.classification);
                                layerText.x = 30;
                                layerText.y = yPos;
                                debugFrame.appendChild(layerText);
                                yPos += 20;
                            });
                        }
                        figma.currentPage.appendChild(debugFrame);
                        figma.viewport.scrollAndZoomIntoView([debugFrame]);
                        return [2 /*return*/];
                }
            });
        });
    };
    ComponentPropertyEngine.getPerformanceReport = function () {
        return PerformanceTracker.getReport();
    };
    ComponentPropertyEngine.componentSchemas = new Map();
    ComponentPropertyEngine.componentHandlers = new Map([
        ['tab', new TabComponentHandler()],
        ['tabs', new TabComponentHandler()],
        ['chip', new ChipComponentHandler()],
    ]);
    ComponentPropertyEngine.commonFontsLoaded = false;
    return ComponentPropertyEngine;
}());
exports.ComponentPropertyEngine = ComponentPropertyEngine;
