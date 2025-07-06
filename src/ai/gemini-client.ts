// src/ai/gemini-client.ts
// Enhanced Gemini Client with improved error handling and API integration

export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiChatRequest {
  messages: GeminiMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface GeminiChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  retryCount?: number;
  finishReason?: string;
}

export interface GeminiError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  statusCode?: number;
}

export class GeminiClient {
  private static readonly DEFAULT_CONFIG: Partial<GeminiClientConfig> = {
    model: 'gemini-1.5-flash',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 4000
  };

  private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  private config: Required<GeminiClientConfig>;

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.config = { ...GeminiClient.DEFAULT_CONFIG, ...config } as Required<GeminiClientConfig>;
  }

  /**
   * Send a chat message and get response
   */
  async chat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    console.log('🤖 Starting Gemini chat request');
    
    try {
      const response = await this.callAPIWithRetry(request);
      console.log(response.success ? '✅ Chat request successful' : '❌ Chat request failed');
      return response;
    } catch (error) {
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
  async complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<GeminiChatResponse> {
    const request: GeminiChatRequest = {
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    };

    return this.chat(request);
  }

  /**
   * Generate structured JSON response
   */
  async generateJSON(prompt: string, systemPrompt?: string): Promise<GeminiChatResponse> {
    const jsonSystemPrompt = systemPrompt 
      ? `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No explanation or additional text.`
      : 'Respond with valid JSON only. No explanation or additional text.';

    const request: GeminiChatRequest = {
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
      } else {
        console.warn('⚠️ Generated content is not valid JSON, returning raw response');
      }
    }

    return response;
  }

  /**
   * Call API with retry logic
   */
  private async callAPIWithRetry(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${this.config.maxRetries}`);
          await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
        }
        
        const response = await this.makeAPICall(request);
        response.retryCount = attempt;
        return response;
        
      } catch (error) {
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
      error: lastError?.message || 'Max retries exceeded',
      retryCount: this.config.maxRetries
    };
  }

  /**
   * Make actual API call to Gemini
   */
  private async makeAPICall(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    const url = `${GeminiClient.API_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    
    // Build contents array from messages
    const contents = this.buildContentsFromMessages(request.messages, request.systemPrompt);

    const requestBody = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
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
        (error as any).statusCode = response.status;
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
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Convert messages to Gemini API format
   */
  private buildContentsFromMessages(messages: GeminiMessage[], systemPrompt?: string): any[] {
    const contents: any[] = [];

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
      let role: string;
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
  private getSafetySettings(): any[] {
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
  private parseAPIError(error: Error): GeminiError {
    const message = error.message.toLowerCase();
    const statusCode = (error as any).statusCode;
    
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
  private validateAndExtractJSON(content: string): string | null {
    try {
      // Try to parse the entire content as JSON first
      JSON.parse(content);
      return content;
    } catch {
      // If that fails, try to find JSON in the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        const jsonString = jsonMatch[0];
        JSON.parse(jsonString); // Validate JSON syntax
        return jsonString;
      } catch {
        return null;
      }
    }
  }

  /**
   * Simple delay utility with exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.complete('Say "Hello" and nothing else.', { temperature: 0 });
      return response.success && (response.content?.toLowerCase().includes('hello') || false);
    } catch {
      return false;
    }
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<GeminiClientConfig>): void {
    this.config = { ...this.config, ...newConfig } as Required<GeminiClientConfig>;
  }

  /**
   * Get current configuration (without API key for security)
   */
  getConfig(): Omit<Required<GeminiClientConfig>, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Get masked API key for display
   */
  getMaskedApiKey(): string {
    if (this.config.apiKey.length < 8) return '****';
    return '****' + this.config.apiKey.slice(-4);
  }

  /**
   * Static method to create instance from Figma storage
   */
  static async createFromStorage(): Promise<GeminiClient | null> {
    try {
      const apiKey = await figma.clientStorage.getAsync('geminiApiKey');
      if (!apiKey) return null;
      
      return new GeminiClient({ apiKey });
    } catch {
      return null;
    }
  }
}