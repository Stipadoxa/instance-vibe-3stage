import { PipelineLogger } from '../../utils/pipeline-logger';

export abstract class BaseRole {
    protected logger?: PipelineLogger;
    
    constructor(logger?: PipelineLogger) {
        this.logger = logger;
        this.safeLog('BaseRole initialized');
    }
    
    protected safeLog(message: string, data?: any) {
        try {
            if (this.logger) {
                console.log(`[${this.constructor.name}] ${message}`, data || '');
            }
        } catch (error) {
            console.warn(`Logging failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    
    abstract execute(input: any): Promise<any>;
}