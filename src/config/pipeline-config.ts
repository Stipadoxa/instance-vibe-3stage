export interface StageConfig {
    qaEnabled: boolean;
}

export interface PipelineConfig {
    stages: {
        productManager: StageConfig;
        jsonEngineer: StageConfig;
    };
    debug: {
        logLevel: 'verbose' | 'minimal';
        failFast: boolean;
    };
}

export const PIPELINE_CONFIG: PipelineConfig = {
    stages: {
        productManager: { qaEnabled: false },
        jsonEngineer: { qaEnabled: true }
    },
    debug: {
        logLevel: 'verbose',
        failFast: true
    }
};