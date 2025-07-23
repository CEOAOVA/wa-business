"use strict";
/**
 * Nuevas interfaces TypeScript para la estructura de tablas actualizada
 * Implementa el sistema de registro de mensajes con agents, contacts, conversations y messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_ROLES = exports.AI_MODES = exports.CONVERSATION_STATUSES = exports.SENDER_TYPES = exports.MESSAGE_TYPES = void 0;
exports.isValidMessageType = isValidMessageType;
exports.isValidSenderType = isValidSenderType;
exports.isValidConversationStatus = isValidConversationStatus;
exports.isValidAIMode = isValidAIMode;
exports.isValidAgentRole = isValidAgentRole;
// ========================================
// CONSTANTES
// ========================================
exports.MESSAGE_TYPES = ['text', 'image', 'audio', 'video', 'document', 'location', 'contact'];
exports.SENDER_TYPES = ['agent', 'contact'];
exports.CONVERSATION_STATUSES = ['open', 'closed', 'escalated', 'waiting'];
exports.AI_MODES = ['active', 'inactive'];
exports.AGENT_ROLES = ['agent', 'supervisor', 'admin'];
// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================
function isValidMessageType(type) {
    return exports.MESSAGE_TYPES.includes(type);
}
function isValidSenderType(type) {
    return exports.SENDER_TYPES.includes(type);
}
function isValidConversationStatus(status) {
    return exports.CONVERSATION_STATUSES.includes(status);
}
function isValidAIMode(mode) {
    return exports.AI_MODES.includes(mode);
}
function isValidAgentRole(role) {
    return exports.AGENT_ROLES.includes(role);
}
