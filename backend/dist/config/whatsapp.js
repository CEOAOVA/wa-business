"use strict";
/**
 * Configuración de WhatsApp Business API - Usando variables de entorno
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeaders = exports.buildApiUrl = exports.whatsappConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables de entorno
dotenv_1.default.config();
// Validar que las variables críticas estén presentes
const requiredEnvVars = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WEBHOOK_VERIFY_TOKEN'
];
// Variables opcionales para seguridad avanzada
const optionalSecurityVars = [
    'WHATSAPP_APP_SECRET', // Para verificación HMAC de webhooks
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Variable de entorno requerida no encontrada: ${envVar}. Por favor, revisa tu archivo .env`);
    }
}
exports.whatsappConfig = {
    // Token de acceso de WhatsApp Business API
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    // ID del número de teléfono de WhatsApp Business
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    // Versión de la API de WhatsApp
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
    // URL base de la API de Graph
    baseUrl: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com',
    // Configuración del webhook
    webhook: {
        verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
        path: process.env.WEBHOOK_PATH || '/api/chat/webhook',
        url: process.env.WEBHOOK_URL, // URL completa del webhook (para ngrok)
        appSecret: process.env.WHATSAPP_APP_SECRET, // App Secret para verificación HMAC
        enableSignatureVerification: process.env.NODE_ENV === 'production' || process.env.ENABLE_WEBHOOK_SIGNATURE === 'true'
    },
    // Configuración de seguridad
    security: {
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // 100 requests por minuto
        },
        enableDetailedLogging: process.env.NODE_ENV === 'development' || process.env.ENABLE_DETAILED_LOGS === 'true'
    },
    // Configuración del servidor
    server: {
        port: parseInt(process.env.PORT || '3002'),
        nodeEnv: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:3002',
        publicUrl: process.env.PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:3002'
    }
};
// Helper para construir URLs de la API
const buildApiUrl = (endpoint) => {
    return `${exports.whatsappConfig.baseUrl}/${exports.whatsappConfig.apiVersion}/${endpoint}`;
};
exports.buildApiUrl = buildApiUrl;
// Headers comunes para las peticiones
const getHeaders = () => ({
    'Authorization': `Bearer ${exports.whatsappConfig.accessToken}`,
    'Content-Type': 'application/json'
});
exports.getHeaders = getHeaders;
