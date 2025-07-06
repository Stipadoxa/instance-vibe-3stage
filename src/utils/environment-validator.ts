export interface EnvironmentCheck {
    consoleGroupAvailable: boolean;
    jsonStringifyAvailable: boolean;
    globalAccessAvailable: boolean;
    basicFunctionsWork: boolean;
}

export class EnvironmentValidator {
    static validateEnvironment(): EnvironmentCheck {
        return {
            consoleGroupAvailable: this.testConsoleGroup(),
            jsonStringifyAvailable: this.testJsonStringify(),
            globalAccessAvailable: this.testGlobalAccess(),
            basicFunctionsWork: this.testBasicFunctions()
        };
    }
    
    private static testConsoleGroup(): boolean {
        try {
            console.group?.('test');
            console.groupEnd?.();
            return true;
        } catch {
            return false;
        }
    }

    private static testJsonStringify(): boolean {
        try {
            JSON.stringify({test: true});
            return true;
        } catch {
            return false;
        }
    }

    private static testGlobalAccess(): boolean {
        try {
            return typeof globalThis !== 'undefined' || 
                   typeof window !== 'undefined' || 
                   typeof global !== 'undefined';
        } catch {
            return false;
        }
    }

    private static testBasicFunctions(): boolean {
        try {
            const testFn = () => true;
            return testFn() === true;
        } catch {
            return false;
        }
    }
}