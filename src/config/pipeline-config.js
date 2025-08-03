"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIPELINE_CONFIG = void 0;
exports.PIPELINE_CONFIG = {
    stages: {
        productManager: { qaEnabled: false },
        jsonEngineer: { qaEnabled: true }
    },
    debug: {
        logLevel: 'verbose',
        failFast: true
    }
};
