"use strict";
// session-manager.ts
// Session state management for AIDesigner
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
exports.SessionManager = void 0;
var SessionManager = /** @class */ (function () {
    function SessionManager() {
    }
    // Зберегти поточний стан сесії
    SessionManager.saveSession = function (designState, scanData) {
        return __awaiter(this, void 0, void 0, function () {
            var fileId, fileName, storage, session, _a, error_1;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 6, , 7]);
                        fileId = figma.root.id;
                        fileName = figma.root.name;
                        // Якщо немає активної ітерації, не зберігаємо
                        if (!designState.isIterating)
                            return [2 /*return*/];
                        console.log("\uD83D\uDCBE \u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F \u0441\u0435\u0441\u0456\u0457 \u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0443: ".concat(fileName));
                        return [4 /*yield*/, this.getSessionStorage()];
                    case 1:
                        storage = _d.sent();
                        _b = {
                            fileId: fileId,
                            fileName: fileName,
                            lastModified: Date.now()
                        };
                        _c = {
                            original: designState.original,
                            current: designState.current,
                            history: __spreadArray([], designState.history, true),
                            frameId: designState.frameId
                        };
                        if (!designState.frameId) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getFrameName(designState.frameId)];
                    case 2:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = '';
                        _d.label = 4;
                    case 4:
                        session = (_b.designState = (_c.frameName = _a,
                            _c.isIterating = designState.isIterating,
                            _c),
                            _b.scanData = scanData,
                            _b);
                        storage.sessions[fileId] = session;
                        storage.lastActiveSession = fileId;
                        return [4 /*yield*/, figma.clientStorage.setAsync(this.STORAGE_KEY, storage)];
                    case 5:
                        _d.sent();
                        console.log("\u2705 \u0421\u0435\u0441\u0456\u044F \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0430");
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _d.sent();
                        console.error('❌ Помилка збереження сесії:', error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Завантажити сесію для поточного файлу
    SessionManager.loadSession = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fileId, storage, session, frame, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        fileId = figma.root.id;
                        return [4 /*yield*/, this.getSessionStorage()];
                    case 1:
                        storage = _a.sent();
                        session = storage.sessions[fileId];
                        if (!session)
                            return [2 /*return*/, null];
                        if (!session.designState.frameId) return [3 /*break*/, 4];
                        return [4 /*yield*/, figma.getNodeByIdAsync(session.designState.frameId)];
                    case 2:
                        frame = _a.sent();
                        if (!(!frame || frame.removed)) return [3 /*break*/, 4];
                        console.log('⚠️ Фрейм з попередньої сесії не знайдено, очищуємо сесію');
                        return [4 /*yield*/, this.clearSession(fileId)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 4:
                        console.log("\u2705 \u0421\u0435\u0441\u0456\u044F \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0443: ".concat(session.fileName));
                        return [2 /*return*/, session];
                    case 5:
                        error_2 = _a.sent();
                        console.error('❌ Помилка завантаження сесії:', error_2);
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Отримати всі активні сесії
    SessionManager.getAllSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storage, now_1, activeSessions, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getSessionStorage()];
                    case 1:
                        storage = _a.sent();
                        now_1 = Date.now();
                        activeSessions = Object.values(storage.sessions)
                            .filter(function (session) { return (now_1 - session.lastModified) < _this.MAX_SESSION_AGE; })
                            .sort(function (a, b) { return b.lastModified - a.lastModified; });
                        return [2 /*return*/, activeSessions];
                    case 2:
                        error_3 = _a.sent();
                        console.error('❌ Помилка завантаження всіх сесій:', error_3);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Очистити сесію для файлу
    SessionManager.clearSession = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var targetFileId, storage, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        targetFileId = fileId || figma.root.id;
                        return [4 /*yield*/, this.getSessionStorage()];
                    case 1:
                        storage = _a.sent();
                        delete storage.sessions[targetFileId];
                        if (storage.lastActiveSession === targetFileId) {
                            delete storage.lastActiveSession;
                        }
                        return [4 /*yield*/, figma.clientStorage.setAsync(this.STORAGE_KEY, storage)];
                    case 2:
                        _a.sent();
                        console.log("\uD83D\uDDD1\uFE0F \u0421\u0435\u0441\u0456\u044F \u043E\u0447\u0438\u0449\u0435\u043D\u0430 \u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0443: ".concat(targetFileId));
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('❌ Помилка очищення сесії:', error_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Очистити старі сесії
    SessionManager.cleanupOldSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storage_1, now_2, cleaned_1, error_5;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getSessionStorage()];
                    case 1:
                        storage_1 = _a.sent();
                        now_2 = Date.now();
                        cleaned_1 = 0;
                        Object.entries(storage_1.sessions).forEach(function (_a) {
                            var fileId = _a[0], session = _a[1];
                            if ((now_2 - session.lastModified) > _this.MAX_SESSION_AGE) {
                                delete storage_1.sessions[fileId];
                                cleaned_1++;
                            }
                        });
                        if (!(cleaned_1 > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, figma.clientStorage.setAsync(this.STORAGE_KEY, storage_1)];
                    case 2:
                        _a.sent();
                        console.log("\uD83E\uDDF9 \u041E\u0447\u0438\u0449\u0435\u043D\u043E ".concat(cleaned_1, " \u0441\u0442\u0430\u0440\u0438\u0445 \u0441\u0435\u0441\u0456\u0439"));
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_5 = _a.sent();
                        console.error('❌ Помилка очищення старих сесій:', error_5);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Отримати storage з ініціалізацією
    SessionManager.getSessionStorage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storage, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, figma.clientStorage.getAsync(this.STORAGE_KEY)];
                    case 1:
                        storage = _a.sent();
                        if (!storage || storage.version !== this.SESSION_VERSION) {
                            return [2 /*return*/, {
                                    sessions: {},
                                    version: this.SESSION_VERSION
                                }];
                        }
                        return [2 /*return*/, storage];
                    case 2:
                        error_6 = _a.sent();
                        console.error('❌ Помилка отримання storage:', error_6);
                        return [2 /*return*/, {
                                sessions: {},
                                version: this.SESSION_VERSION
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Отримати назву фрейму за ID
    SessionManager.getFrameName = function (frameId) {
        return __awaiter(this, void 0, void 0, function () {
            var frame, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, figma.getNodeByIdAsync(frameId)];
                    case 1:
                        frame = _b.sent();
                        return [2 /*return*/, (frame === null || frame === void 0 ? void 0 : frame.name) || 'Unknown Frame'];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, 'Unknown Frame'];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Відновити сесію з даних
    SessionManager.restoreSessionData = function (sessionData) {
        return __awaiter(this, void 0, void 0, function () {
            var frame, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!sessionData.designState.frameId) return [3 /*break*/, 2];
                        return [4 /*yield*/, figma.getNodeByIdAsync(sessionData.designState.frameId)];
                    case 1:
                        frame = _a.sent();
                        if (!frame || frame.removed) {
                            throw new Error('Фрейм не знайдено');
                        }
                        // Перейти до фрейму
                        figma.currentPage.selection = [frame];
                        figma.viewport.scrollAndZoomIntoView([frame]);
                        _a.label = 2;
                    case 2: return [2 /*return*/, true];
                    case 3:
                        error_7 = _a.sent();
                        console.error('❌ Помилка відновлення сесії:', error_7);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SessionManager.STORAGE_KEY = 'aidesigner-sessions';
    SessionManager.SESSION_VERSION = '1.0';
    SessionManager.MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 днів
    return SessionManager;
}());
exports.SessionManager = SessionManager;
