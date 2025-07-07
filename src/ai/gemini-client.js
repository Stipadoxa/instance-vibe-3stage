"use strict";
// src/ai/gemini-client.ts
// Enhanced Gemini Client with improved error handling and API integration
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
class GeminiClient {
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.config = Object.assign(Object.assign({}, GeminiClient.DEFAULT_CONFIG), config);
    }
    /**
     * Send a chat message and get response
     */
    async chat(request) {
        console.log('🤖 Starting Gemini chat request');
        try {
            const response = await this.callAPIWithRetry(request);
            console.log(response.success ? '✅ Chat request successful' : '❌ Chat request failed');
            return response;
        }
        catch (error) {
            console.error('❌ Gemini chat failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown chat error'
            };
        }
    }
    /**
     * Simple text completion
     */
    async complete(prompt, options) {
        const request = {
            messages: [{ role: 'user', content: prompt }],
            temperature: options === null || options === void 0 ? void 0 : options.temperature,
            maxTokens: options === null || options === void 0 ? void 0 : options.maxTokens
        };
        return this.chat(request);
    }
    /**
     * Generate structured JSON response
     */
    async generateJSON(prompt, systemPrompt) {
        const jsonSystemPrompt = systemPrompt
            ? `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No explanation or additional text.`
            : 'Respond with valid JSON only. No explanation or additional text.';
        const request = {
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: jsonSystemPrompt,
            temperature: 0.3 // Lower temperature for more consistent JSON
        };
        const response = await this.chat(request);
        if (response.success && response.content) {
            const validatedJSON = this.validateAndExtractJSON(response.content);
            if (validatedJSON) {
                response.content = validatedJSON;
                console.log('✅ Valid JSON generated and validated');
            }
            else {
                console.warn('⚠️ Generated content is not valid JSON, returning raw response');
            }
        }
        return response;
    }
    /**
     * Call API with retry logic
     */
    async callAPIWithRetry(request) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 Retry attempt ${attempt}/${this.config.maxRetries}`);
                    await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
                }
                const response = await this.makeAPICall(request);
                response.retryCount = attempt;
                return response;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                const geminiError = this.parseAPIError(lastError);
                console.error(`❌ API call attempt ${attempt + 1} failed:`, geminiError.message);
                // If error is not retryable, fail immediately
                if (!geminiError.retryable || attempt === this.config.maxRetries) {
                    return {
                        success: false,
                        error: geminiError.message,
                        retryCount: attempt
                    };
                }
            }
        }
        return {
            success: false,
            error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Max retries exceeded',
            retryCount: this.config.maxRetries
        };
    }
    /**
     * Make actual API call to Gemini
     */
    async makeAPICall(request) {
        var _a, _b;
        const url = `${GeminiClient.API_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
        // Build contents array from messages
        const contents = this.buildContentsFromMessages(request.messages, request.systemPrompt);
        const requestBody = {
            contents,
            generationConfig: {
                temperature: (_a = request.temperature) !== null && _a !== void 0 ? _a : this.config.temperature,
                maxOutputTokens: (_b = request.maxTokens) !== null && _b !== void 0 ? _b : this.config.maxTokens,
                topK: 40,
                topP: 0.95
            },
            safetySettings: this.getSafetySettings()
        };
        console.log('📡 Making API call to Gemini...');
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`HTTP ${response.status}: ${errorText}`);
                error.statusCode = response.status;
                throw error;
            }
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No candidates returned from API');
            }
            const candidate = data.candidates[0];
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Content was blocked by safety filters');
            }
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('No content in API response');
            }
            const content = candidate.content.parts[0].text;
            return {
                success: true,
                content: content.trim(),
                finishReason: candidate.finishReason,
                usage: data.usageMetadata ? {
                    promptTokens: data.usageMetadata.promptTokenCount || 0,
                    completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                    totalTokens: data.usageMetadata.totalTokenCount || 0
                } : undefined
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    /**
     * Convert messages to Gemini API format
     */
    buildContentsFromMessages(messages, systemPrompt) {
        const contents = [];
        // Add system prompt if provided
        if (systemPrompt) {
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'I understand the instructions.' }]
            });
        }
        // Convert messages to Gemini format
        for (const message of messages) {
            let role;
            switch (message.role) {
                case 'system':
                    // System messages are handled separately above
                    continue;
                case 'user':
                    role = 'user';
                    break;
                case 'assistant':
                    role = 'model';
                    break;
                default:
                    role = 'user';
            }
            contents.push({
                role,
                parts: [{ text: message.content }]
            });
        }
        return contents;
    }
    /**
     * Get safety settings for API calls
     */
    getSafetySettings() {
        return [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ];
    }
    /**
     * Parse and categorize API errors
     */
    parseAPIError(error) {
        const message = error.message.toLowerCase();
        const statusCode = error.statusCode;
        // Rate limiting
        if (message.includes('quota') || message.includes('rate limit') || statusCode === 429) {
            return {
                code: 'RATE_LIMIT',
                message: 'Rate limit exceeded. Please try again later.',
                retryable: true,
                statusCode
            };
        }
        // Authentication
        if (statusCode === 401 || message.includes('unauthorized') || message.includes('api key')) {
            return {
                code: 'AUTH_ERROR',
                message: 'Invalid API key or authentication failed.',
                retryable: false,
                statusCode
            };
        }
        // Bad request
        if (statusCode === 400) {
            return {
                code: 'BAD_REQUEST',
                message: 'Invalid request format or parameters.',
                retryable: false,
                statusCode
            };
        }
        // Network/timeout errors
        if (message.includes('timeout') || message.includes('network') || message.includes('fetch') || message.includes('aborted')) {
            return {
                code: 'NETWORK_ERROR',
                message: 'Network error or timeout. Please check your connection.',
                retryable: true,
                statusCode
            };
        }
        // Server errors (5xx)
        if (statusCode >= 500 || message.includes('500') || message.includes('502') || message.includes('503')) {
            return {
                code: 'SERVER_ERROR',
                message: 'Server error. Please try again later.',
                retryable: true,
                statusCode
            };
        }
        // Content filtering
        if (message.includes('safety') || message.includes('blocked')) {
            return {
                code: 'CONTENT_FILTERED',
                message: 'Content was blocked by safety filters.',
                retryable: false,
                statusCode
            };
        }
        // Model overloaded
        if (message.includes('overloaded') || statusCode === 503) {
            return {
                code: 'MODEL_OVERLOADED',
                message: 'Model is currently overloaded. Please try again later.',
                retryable: true,
                statusCode
            };
        }
        // Generic error
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred',
            retryable: true,
            statusCode
        };
    }
    /**
     * Validate and extract JSON from response
     */
    validateAndExtractJSON(content) {
        try {
            // Try to parse the entire content as JSON first
            JSON.parse(content);
            return content;
        }
        catch (_a) {
            // If that fails, try to find JSON in the response
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch)
                    return null;
                const jsonString = jsonMatch[0];
                JSON.parse(jsonString); // Validate JSON syntax
                return jsonString;
            }
            catch (_b) {
                return null;
            }
        }
    }
    /**
     * Simple delay utility with exponential backoff
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Test API connection
     */
    async testConnection() {
        var _a;
        try {
            const response = await this.complete('Say "Hello" and nothing else.', { temperature: 0 });
            return response.success && (((_a = response.content) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('hello')) || false);
        }
        catch (_b) {
            return false;
        }
    }
    /**
     * Update client configuration
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
    }
    /**
     * Get current configuration (without API key for security)
     */
    getConfig() {
        const _a = this.config, { apiKey } = _a, safeConfig = __rest(_a, ["apiKey"]);
        return safeConfig;
    }
    /**
     * Get masked API key for display
     */
    getMaskedApiKey() {
        if (this.config.apiKey.length < 8)
            return '****';
        return '****' + this.config.apiKey.slice(-4);
    }
    /**
     * Static method to create instance from Figma storage
     */
    static async createFromStorage() {
        try {
            const apiKey = await figma.clientStorage.getAsync('geminiApiKey');
            if (!apiKey)
                return null;
            return new GeminiClient({ apiKey });
        }
        catch (_a) {
            return null;
        }
    }
}
exports.GeminiClient = GeminiClient;
GeminiClient.DEFAULT_CONFIG = {
    model: 'gemini-1.5-flash',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 4000
};
GeminiClient.API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
