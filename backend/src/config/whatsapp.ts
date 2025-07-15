/**
 * Configuración de WhatsApp Business API - Usando variables de entorno
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Verificar si WhatsApp está configurado (modo opcional para desarrollo)
const isWhatsAppConfigured = !!(
  process.env.WHATSAPP_ACCESS_TOKEN && 
  process.env.WHATSAPP_PHONE_NUMBER_ID && 
  process.env.WEBHOOK_VERIFY_TOKEN
);

if (!isWhatsAppConfigured) {
  console.warn('⚠️ WhatsApp no está configurado. El servidor funcionará sin capacidades de WhatsApp.');
  console.warn('📝 Para habilitar WhatsApp, configura: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WEBHOOK_VERIFY_TOKEN');
}

export const whatsappConfig = {
  // Indicador de si WhatsApp está configurado
  isConfigured: isWhatsAppConfigured,
  
  // Token de acceso de WhatsApp Business API
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'not_configured',
  
  // ID del número de teléfono de WhatsApp Business
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'not_configured',
  
  // Versión de la API de WhatsApp
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
  
  // URL base de la API de Graph
  baseUrl: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com',
  
  // Configuración del webhook
  webhook: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'not_configured',
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
export const buildApiUrl = (endpoint: string): string => {
  return `${whatsappConfig.baseUrl}/${whatsappConfig.apiVersion}/${endpoint}`;
};

// Headers comunes para las peticiones
export const getHeaders = () => {
  if (!whatsappConfig.isConfigured) {
    console.warn('⚠️ WhatsApp no configurado - headers simulados');
    return {
      'Authorization': 'Bearer not_configured',
      'Content-Type': 'application/json'
    };
  }
  
  return {
    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
    'Content-Type': 'application/json'
  };
}; 