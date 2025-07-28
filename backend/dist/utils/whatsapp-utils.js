"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhoneNumber = validatePhoneNumber;
exports.verifyWebhook = verifyWebhook;
exports.getWebhookDebugInfo = getWebhookDebugInfo;
exports.setWebhookUrl = setWebhookUrl;
exports.getStats = getStats;
const whatsapp_1 = require("../config/whatsapp");
/**
 * Validar y formatear número de teléfono para WhatsApp
 */
function validatePhoneNumber(phone) {
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
    }
    catch (error) {
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
function verifyWebhook(mode, token, challenge) {
    try {
        // Verificar que el modo sea 'subscribe'
        if (mode !== 'subscribe') {
            console.error('❌ Modo de webhook inválido:', mode);
            return null;
        }
        // Verificar que el token coincida
        if (token !== whatsapp_1.whatsappConfig.webhook.verifyToken) {
            console.error('❌ Token de verificación inválido');
            console.error('❌ Token recibido:', token);
            console.error('❌ Token esperado:', whatsapp_1.whatsappConfig.webhook.verifyToken);
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
    }
    catch (error) {
        console.error('❌ Error en verificación de webhook:', error);
        return null;
    }
}
/**
 * Obtener información de debug del webhook
 */
function getWebhookDebugInfo() {
    return {
        url: whatsapp_1.whatsappConfig.webhook.url,
        path: whatsapp_1.whatsappConfig.webhook.path,
        verifyTokenConfigured: whatsapp_1.whatsappConfig.webhook.verifyToken !== 'not_configured',
        verifyTokenLength: whatsapp_1.whatsappConfig.webhook.verifyToken.length,
        accessTokenConfigured: whatsapp_1.whatsappConfig.accessToken !== 'not_configured',
        phoneNumberIdConfigured: whatsapp_1.whatsappConfig.phoneNumberId !== 'not_configured',
        signatureVerificationEnabled: whatsapp_1.whatsappConfig.webhook.enableSignatureVerification,
        apiVersion: whatsapp_1.whatsappConfig.apiVersion
    };
}
/**
 * Configurar URL del webhook
 */
function setWebhookUrl(callbackUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // En una implementación real, aquí se haría una llamada a la API de Meta
            // para configurar el webhook en el panel de desarrolladores
            console.log('🔧 Configurando webhook URL:', callbackUrl);
            // Por ahora, solo loggeamos la URL
            // En producción, esto debería hacer una llamada a la API de Meta
            return {
                success: true
            };
        }
        catch (error) {
            console.error('❌ Error configurando webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });
}
/**
 * Obtener estadísticas básicas
 */
function getStats() {
    return {
        success: true,
        stats: {
            whatsappConfigured: whatsapp_1.whatsappConfig.isConfigured,
            webhookConfigured: whatsapp_1.whatsappConfig.webhook.verifyToken !== 'not_configured',
            apiVersion: whatsapp_1.whatsappConfig.apiVersion,
            timestamp: new Date().toISOString()
        }
    };
}
