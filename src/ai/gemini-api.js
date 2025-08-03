"use strict";
// src/ai/gemini-api.ts
// Gemini API integration and management for AIDesigner
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
exports.GeminiAPI = void 0;
class GeminiAPI {
    constructor(config) {
        this.config = Object.assign(Object.assign({}, GeminiAPI.DEFAULT_CONFIG), config);
        if (!this.config.apiKey) {
            throw new Error('Gemini API key is required');
        }
    }
    /**
     * Main method to generate JSON from prompt
     */
    async generateJSON(request) {
        console.log('🤖 Starting Gemini API call for JSON generation');
        try {
            const response = await this.callAPIWithRetry(request);
            if (response.success && response.content) {
                // Validate that response contains valid JSON
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
        catch (error) {
            console.error('❌ Gemini API call failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown API error'
            };
        }
    }
    /**
     * Generate UI modification suggestions
     */
    async modifyExistingUI(originalJSON, modificationRequest, systemPrompt) {
        console.log('🔄 Starting UI modification with Gemini');
        const prompt = `You are tasked with modifying an existing UI JSON structure based on user feedback.

ORIGINAL JSON:
${originalJSON}

MODIFICATION REQUEST:
${modificationRequest}

Please provide the complete modified JSON structure. Make sure to:
1. Keep the same overall structure
2. Maintain all existing componentNodeId values
3. Only modify the requested elements
4. Ensure all JSON is valid and complete

Return ONLY the modified JSON, no explanation needed.`;
        const request = {
            prompt,
            systemPrompt,
            temperature: 0.3 // Lower temperature for more consistent modifications
        };
        return this.generateJSON(request);
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
                    await this.delay(this.config.retryDelay * attempt);
                }
                const response = await this.makeAPICall(request);
                response.retryCount = attempt;
                return response;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                const apiError = this.parseAPIError(lastError);
                console.error(`❌ API call attempt ${attempt + 1} failed:`, apiError.message);
                // If error is not retryable, fail immediately
                if (!apiError.retryable || attempt === this.config.maxRetries) {
                    return {
                        success: false,
                        error: apiError.message,
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
        const url = `${GeminiAPI.API_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
        const systemInstruction = request.systemPrompt ? {
            role: 'system',
            parts: [{ text: request.systemPrompt }]
        } : null;
        const requestBody = {
            contents: [
                ...(systemInstruction ? [systemInstruction] : []),
                {
                    role: 'user',
                    parts: [{ text: request.prompt + (request.context ? `\n\nContext: ${request.context}` : '') }]
                }
            ],
            generationConfig: {
                temperature: (_a = request.temperature) !== null && _a !== void 0 ? _a : 0.7,
                maxOutputTokens: (_b = request.maxTokens) !== null && _b !== void 0 ? _b : 4000,
                topK: 40,
                topP: 0.95
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_ONLY_HIGH'
                }
            ]
        };
        console.log('📡 Making API call to Gemini...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
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
            console.log('✅ Gemini API call successful');
            return {
                success: true,
                content: content.trim(),
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
     * Parse and categorize API errors
     */
    parseAPIError(error) {
        const message = error.message.toLowerCase();
        // Rate limiting
        if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
            return {
                code: 'RATE_LIMIT',
                message: 'Rate limit exceeded. Please try again later.',
                retryable: true
            };
        }
        // Authentication
        if (message.includes('401') || message.includes('unauthorized') || message.includes('api key')) {
            return {
                code: 'AUTH_ERROR',
                message: 'Invalid API key or authentication failed.',
                retryable: false
            };
        }
        // Network/timeout errors
        if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
            return {
                code: 'NETWORK_ERROR',
                message: 'Network error or timeout. Please check your connection.',
                retryable: true
            };
        }
        // Server errors (5xx)
        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return {
                code: 'SERVER_ERROR',
                message: 'Server error. Please try again later.',
                retryable: true
            };
        }
        // Content filtering
        if (message.includes('safety') || message.includes('blocked')) {
            return {
                code: 'CONTENT_FILTERED',
                message: 'Content was blocked by safety filters.',
                retryable: false
            };
        }
        // Generic error
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message,
            retryable: true
        };
    }
    /**
     * Validate and extract JSON from response
     */
    validateAndExtractJSON(content) {
        try {
            // Try to find JSON in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                return null;
            const jsonString = jsonMatch[0];
            // Validate JSON syntax
            JSON.parse(jsonString);
            return jsonString;
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Simple delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Update API configuration
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
     * Test API connection
     */
    async testConnection() {
        var _a;
        try {
            const testRequest = {
                prompt: 'Say "Hello, API connection successful!" and nothing else.',
                temperature: 0
            };
            const response = await this.makeAPICall(testRequest);
            return response.success && (((_a = response.content) === null || _a === void 0 ? void 0 : _a.includes('Hello, API connection successful!')) || false);
        }
        catch (_b) {
            return false;
        }
    }
    /**
     * Static method to create instance from stored API key
     */
    static async createFromStorage() {
        try {
            const apiKey = await figma.clientStorage.getAsync('geminiApiKey');
            if (!apiKey)
                return null;
            return new GeminiAPI({ apiKey });
        }
        catch (_a) {
            return null;
        }
    }
}
exports.GeminiAPI = GeminiAPI;
GeminiAPI.DEFAULT_CONFIG = {
    model: 'gemini-1.5-flash',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
};
GeminiAPI.API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
