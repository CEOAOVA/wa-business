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
exports.testWhatsAppWebhook = testWhatsAppWebhook;
const whatsapp_service_1 = require("../services/whatsapp.service");
const database_service_1 = require("../services/database.service");
/**
 * Script para simular un webhook de WhatsApp y ver el procesamiento completo
 */
function testWhatsAppWebhook() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Simulando webhook de WhatsApp...\n');
        try {
            // 1. Inicializar servicios
            console.log('📱 Inicializando servicios...');
            yield whatsapp_service_1.whatsappService.initialize();
            yield database_service_1.databaseService.connect();
            console.log('✅ Servicios inicializados');
            // 2. Simular mensaje de WhatsApp
            console.log('\n📨 Simulando mensaje de WhatsApp...');
            const mockWebhookMessage = {
                object: 'whatsapp_business_account',
                entry: [
                    {
                        id: '123456789',
                        changes: [
                            {
                                value: {
                                    messaging_product: 'whatsapp',
                                    metadata: {
                                        display_phone_number: '1234567890',
                                        phone_number_id: '123456789'
                                    },
                                    contacts: [
                                        {
                                            profile: {
                                                name: 'Cliente Test'
                                            },
                                            wa_id: '5512345678'
                                        }
                                    ],
                                    messages: [
                                        {
                                            from: '5512345678',
                                            id: 'msg-test-123',
                                            timestamp: Math.floor(Date.now() / 1000).toString(),
                                            text: {
                                                body: 'Hola, necesito balatas para mi Toyota Corolla 2018'
                                            },
                                            type: 'text'
                                        }
                                    ]
                                },
                                field: 'messages'
                            }
                        ]
                    }
                ]
            };
            console.log('📝 Mensaje simulado:', mockWebhookMessage.entry[0].changes[0].value.messages[0].text.body);
            // 3. Procesar el webhook
            console.log('\n🔄 Procesando webhook...');
            yield whatsapp_service_1.whatsappService.processWebhook(mockWebhookMessage);
            console.log('✅ Webhook procesado');
            // 4. Verificar conversación creada
            console.log('\n🔍 Verificando conversación...');
            const conversation = yield database_service_1.databaseService.getOrCreateConversationByPhone('5512345678');
            if (conversation) {
                console.log('✅ Conversación encontrada:', conversation.id);
                console.log(`  Estado: ${conversation.status}`);
                console.log(`  AI Mode: ${conversation.ai_mode}`);
                console.log(`  Takeover Mode: ${conversation.takeover_mode}`);
            }
            else {
                console.log('❌ No se pudo crear/obtener conversación');
            }
            // 5. Verificar mensajes creados
            console.log('\n📋 Verificando mensajes...');
            if (conversation) {
                const messages = yield database_service_1.databaseService.getConversationMessages(conversation.id, 10);
                console.log(`✅ ${messages.length} mensajes encontrados:`);
                messages.forEach((msg, index) => {
                    console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
                });
            }
            console.log('\n🎉 Prueba de webhook completada!');
        }
        catch (error) {
            console.error('❌ Error en la prueba:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testWhatsAppWebhook()
        .then(() => {
        console.log('✅ Prueba de webhook completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en prueba:', error);
        process.exit(1);
    });
}
