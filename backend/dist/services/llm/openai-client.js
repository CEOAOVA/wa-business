"use strict";
/**
 * OpenAI Client mejorado para OpenRouter + Gemini
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIClient = exports.OpenAIClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
class OpenAIClient {
    constructor() {
        this.config = (0, config_1.getConfig)();
        this.client = axios_1.default.create({
            baseURL: this.config.llm.openRouterBaseUrl,
            headers: {
                'Authorization': `Bearer ${this.config.llm.openRouterApiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: this.config.llm.timeout,
        });
    }
    createChatCompletion(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                const response = yield this.client.post('/chat/completions', {
                    model: options.model || this.config.llm.openRouterModel,
                    temperature: options.temperature || this.config.llm.defaultTemperature,
                    max_tokens: options.max_tokens || this.config.llm.defaultMaxTokens,
                    messages: options.messages,
                    tools: options.tools,
                });
                const data = response.data;
                // Transformar la respuesta al formato esperado
                const result = {
                    choices: data.choices,
                    usage: data.usage,
                    content: ((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '',
                    function_call: (_f = (_e = (_d = data.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.function_call,
                    tool_calls: (_j = (_h = (_g = data.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.message) === null || _j === void 0 ? void 0 : _j.tool_calls,
                };
                return result;
            }
            catch (error) {
                console.error('Error en OpenAI client:', error);
                throw error;
            }
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const start = Date.now();
                yield this.createChatCompletion({
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1,
                });
                const latency = Date.now() - start;
                return { success: true, latency };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
}
exports.OpenAIClient = OpenAIClient;
exports.openAIClient = new OpenAIClient();
