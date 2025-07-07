export const PIPELINE_CONFIG = {
    stages: {
        productManager: { qaEnabled: false },
        jsonEngineer: { qaEnabled: true }
    },
    debug: {
        logLevel: 'verbose',
        failFast: true
    }
};
