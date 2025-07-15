/**
 * OpenAI Client mejorado para OpenRouter + Gemini
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */

import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../../config';

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  tools?: any[];
  functions?: any[];
  function_call?: any;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  content?: string;
  function_call?: any;
  tool_calls?: any[];
  model?: string;
}

export class OpenAIClient {
  private client: AxiosInstance;
  private config: any;

  constructor() {
    this.config = getConfig();
    this.client = axios.create({
      baseURL: this.config.llm.openRouterBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.llm.openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.config.llm.timeout,
    });
  }

  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || this.config.llm.openRouterModel,
        temperature: options.temperature || this.config.llm.defaultTemperature,
        max_tokens: options.max_tokens || this.config.llm.defaultMaxTokens,
        messages: options.messages,
        tools: options.tools,
      });

      const data = response.data;
      
      // Transformar la respuesta al formato esperado
      const result: ChatCompletionResponse = {
        choices: data.choices,
        usage: data.usage,
        content: data.choices?.[0]?.message?.content || '',
        function_call: data.choices?.[0]?.message?.function_call,
        tool_calls: data.choices?.[0]?.message?.tool_calls,
      };

      return result;
    } catch (error) {
      console.error('Error en OpenAI client:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      const start = Date.now();
      await this.createChatCompletion({
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      const latency = Date.now() - start;
      return { success: true, latency };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const openAIClient = new OpenAIClient(); 