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
exports.testMessageCreation = testMessageCreation;
const database_service_1 = require("../services/database.service");
/**
 * Script para probar la creación de mensajes y verificar que el error se ha corregido
 */
function testMessageCreation() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Probando creación de mensajes...\n');
        try {
            // 1. Conectar a la base de datos
            console.log('🗄️ Conectando a la base de datos...');
            yield database_service_1.databaseService.connect();
            console.log('✅ Base de datos conectada');
            // 2. Crear una conversación de prueba
            console.log('\n📝 Creando conversación de prueba...');
            const conversation = yield database_service_1.databaseService.getOrCreateConversationByPhone('5512345678');
            if (!conversation) {
                console.log('❌ No se pudo crear conversación');
                return;
            }
            console.log('✅ Conversación creada:', conversation.id);
            // 3. Crear un mensaje del usuario
            console.log('\n📨 Creando mensaje del usuario...');
            const userMessageResult = yield database_service_1.databaseService.createChatbotMessage({
                conversationId: conversation.id,
                senderType: 'user',
                content: 'Hola, esto es una prueba',
                messageType: 'text',
                whatsappMessageId: 'msg-test-user-123'
            });
            if (userMessageResult.success) {
                console.log('✅ Mensaje del usuario creado:', userMessageResult.messageId);
            }
            else {
                console.log('❌ Error creando mensaje del usuario');
            }
            // 4. Crear un mensaje del bot
            console.log('\n🤖 Creando mensaje del bot...');
            const botMessageResult = yield database_service_1.databaseService.createChatbotMessage({
                conversationId: conversation.id,
                senderType: 'bot',
                content: 'Hola! ¿En qué puedo ayudarte?',
                messageType: 'text',
                whatsappMessageId: 'msg-test-bot-123'
            });
            if (botMessageResult.success) {
                console.log('✅ Mensaje del bot creado:', botMessageResult.messageId);
            }
            else {
                console.log('❌ Error creando mensaje del bot');
            }
            // 5. Verificar mensajes creados
            console.log('\n📋 Verificando mensajes creados...');
            const messages = yield database_service_1.databaseService.getChatbotConversationMessages(conversation.id, 10);
            console.log(`✅ ${messages.length} mensajes encontrados:`);
            messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
            });
            // 6. Verificar conversación actualizada
            console.log('\n🔍 Verificando conversación actualizada...');
            const updatedConversation = yield database_service_1.databaseService.getOrCreateConversationByPhone('5512345678');
            if (updatedConversation) {
                console.log('✅ Conversación actualizada:');
                console.log(`  Unread count: ${updatedConversation.unread_count}`);
                console.log(`  Last message at: ${updatedConversation.last_message_at}`);
            }
            console.log('\n🎉 Prueba de creación de mensajes completada!');
        }
        catch (error) {
            console.error('❌ Error en la prueba:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testMessageCreation()
        .then(() => {
        console.log('✅ Prueba completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en prueba:', error);
        process.exit(1);
    });
}
