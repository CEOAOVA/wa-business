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
        // Si el número empieza con 52 (código de México), procesarlo correctamente
        if (cleaned.startsWith('52')) {
            // Si tiene exactamente 12 dígitos (52 + 10 dígitos), está bien formateado
            if (cleaned.length === 12) {
                return {
                    isValid: true,
                    formatted: cleaned,
                    error: undefined
                };
            }
            // Si tiene exactamente 13 dígitos y empieza con 521, está bien formateado
            if (cleaned.length === 13 && cleaned.startsWith('521')) {
                return {
                    isValid: true,
                    formatted: cleaned,
                    error: undefined
                };
            }
            // Si tiene más de 13 dígitos, verificar si es un número válido de México
            if (cleaned.length > 13) {
                // Si empieza con 521 (código de México + área), mantener el formato
                if (cleaned.startsWith('521')) {
                    // Tomar los primeros 13 dígitos para mantener el formato correcto
                    cleaned = cleaned.substring(0, 13);
                    console.log(`📱 [PhoneValidation] Número mexicano con área truncado a 13 dígitos: ${cleaned}`);
                    return {
                        isValid: true,
                        formatted: cleaned,
                        error: undefined
                    };
                }
                else {
                    // Para otros casos, tomar los últimos 12 dígitos
                    cleaned = cleaned.slice(-12);
                    console.log(`📱 [PhoneValidation] Número con código 52 truncado a últimos 12 dígitos: ${cleaned}`);
                    return {
                        isValid: true,
                        formatted: cleaned,
                        error: undefined
                    };
                }
            }
            // Si tiene menos de 12 dígitos pero empieza con 52, es inválido
            return {
                isValid: false,
                formatted: phone,
                error: 'Número mexicano incompleto (debe tener 12 dígitos con código 52)'
            };
        }
        // Si empieza con 1 (código de país), removerlo para México
        // SOLO si no es un número mexicano (no empieza con 52)
        if (cleaned.startsWith('1') && cleaned.length === 11 && !cleaned.startsWith('521')) {
            cleaned = cleaned.substring(1);
            console.log(`📱 [PhoneValidation] Removido código de país 1: ${cleaned}`);
        }
        // Si el número tiene más de 10 dígitos, tomar los últimos 10
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(-10);
            console.log(`📱 [PhoneValidation] Número truncado a últimos 10 dígitos: ${cleaned}`);
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
