import { whatsappConfig } from '../config/whatsapp';

/**
 * Utilidades para WhatsApp Business API
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validar y formatear número de teléfono para WhatsApp
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  try {
    // Remover todos los caracteres no numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Verificar que tenga al menos 10 dígitos
    if (cleaned.length < 10) {
      return {
        isValid: false,
        formatted: phone,
        error: 'El número debe tener al menos 10 dígitos'
      };
    }
    
    // Si el número tiene más de 10 dígitos, tomar los últimos 10
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(-10);
      console.log(`📱 [PhoneValidation] Número truncado a últimos 10 dígitos: ${cleaned}`);
    }
    
    // Si empieza con 1 (código de país), removerlo para México
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    
    // Verificar que sea un número válido de México (10 dígitos)
    if (cleaned.length !== 10) {
      return {
        isValid: false,
        formatted: phone,
        error: 'El número debe tener 10 dígitos (formato mexicano)'
      };
    }
    
    // Formatear para WhatsApp (código de país + número)
    const formatted = `52${cleaned}`;
    
    return {
      isValid: true,
      formatted,
      error: undefined
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: phone,
      error: 'Error validando número de teléfono'
    };
  }
}

/**
 * Verificar webhook de WhatsApp
 */
export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  try {
    // Verificar que el modo sea 'subscribe'
    if (mode !== 'subscribe') {
      console.error('❌ Modo de webhook inválido:', mode);
      return null;
    }
    
    // Verificar que el token coincida
    if (token !== whatsappConfig.webhook.verifyToken) {
      console.error('❌ Token de verificación inválido');
      console.error('❌ Token recibido:', token);
      console.error('❌ Token esperado:', whatsappConfig.webhook.verifyToken);
      return null;
    }
    
    // Verificar que el challenge esté presente
    if (!challenge) {
      console.error('❌ Challenge no proporcionado');
      return null;
    }
    
    console.log('✅ Verificación de webhook exitosa');
    console.log('✅ Challenge:', challenge);
    
    // Retornar el challenge para que WhatsApp lo reciba
    return challenge;
  } catch (error) {
    console.error('❌ Error en verificación de webhook:', error);
    return null;
  }
}

/**
 * Obtener información de debug del webhook
 */
export function getWebhookDebugInfo() {
  return {
    url: whatsappConfig.webhook.url,
    path: whatsappConfig.webhook.path,
    verifyTokenConfigured: whatsappConfig.webhook.verifyToken !== 'not_configured',
    verifyTokenLength: whatsappConfig.webhook.verifyToken.length,
    accessTokenConfigured: whatsappConfig.accessToken !== 'not_configured',
    phoneNumberIdConfigured: whatsappConfig.phoneNumberId !== 'not_configured',
    signatureVerificationEnabled: whatsappConfig.webhook.enableSignatureVerification,
    apiVersion: whatsappConfig.apiVersion
  };
}

/**
 * Configurar URL del webhook
 */
export async function setWebhookUrl(callbackUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // En una implementación real, aquí se haría una llamada a la API de Meta
    // para configurar el webhook en el panel de desarrolladores
    
    console.log('🔧 Configurando webhook URL:', callbackUrl);
    
    // Por ahora, solo loggeamos la URL
    // En producción, esto debería hacer una llamada a la API de Meta
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('❌ Error configurando webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener estadísticas básicas
 */
export function getStats() {
  return {
    success: true,
    stats: {
      whatsappConfigured: whatsappConfig.isConfigured,
      webhookConfigured: whatsappConfig.webhook.verifyToken !== 'not_configured',
      apiVersion: whatsappConfig.apiVersion,
      timestamp: new Date().toISOString()
    }
  };
} 