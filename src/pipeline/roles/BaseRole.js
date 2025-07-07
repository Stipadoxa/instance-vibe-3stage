"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRole = void 0;
class BaseRole {
    constructor(logger) {
        this.logger = logger;
        this.safeLog('BaseRole initialized');
    }
    safeLog(message, data) {
        try {
            if (this.logger) {
                console.log(`[${this.constructor.name}] ${message}`, data || '');
            }
        }
        catch (error) {
            console.warn(`Logging failed: ${error instanceof Error ? error.message : error}`);
        }
    }
}
exports.BaseRole = BaseRole;
