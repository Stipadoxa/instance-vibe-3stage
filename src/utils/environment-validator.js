export class EnvironmentValidator {
    static validateEnvironment() {
        return {
            consoleGroupAvailable: this.testConsoleGroup(),
            jsonStringifyAvailable: this.testJsonStringify(),
            globalAccessAvailable: this.testGlobalAccess(),
            basicFunctionsWork: this.testBasicFunctions()
        };
    }
    static testConsoleGroup() {
        var _a, _b;
        try {
            (_a = console.group) === null || _a === void 0 ? void 0 : _a.call(console, 'test');
            (_b = console.groupEnd) === null || _b === void 0 ? void 0 : _b.call(console);
            return true;
        }
        catch (_c) {
            return false;
        }
    }
    static testJsonStringify() {
        try {
            JSON.stringify({ test: true });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    static testGlobalAccess() {
        try {
            return typeof globalThis !== 'undefined' ||
                typeof window !== 'undefined' ||
                typeof global !== 'undefined';
        }
        catch (_a) {
            return false;
        }
    }
    static testBasicFunctions() {
        try {
            const testFn = () => true;
            return testFn() === true;
        }
        catch (_a) {
            return false;
        }
    }
}
