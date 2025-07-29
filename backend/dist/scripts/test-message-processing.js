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
exports.testMessageProcessing = testMessageProcessing;
const whatsapp_service_1 = require("../services/whatsapp.service");
const database_service_1 = require("../services/database.service");
/**
 * Script para probar el procesamiento de mensajes
 */
function testMessageProcessing() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Probando procesamiento de mensajes...\n');
        try {
            // 1. Verificar que el servicio de WhatsApp esté inicializado
            console.log('📱 Verificando servicio de WhatsApp...');
            yield whatsapp_service_1.whatsappService.initialize();
            console.log('✅ Servicio de WhatsApp inicializado');
            // 2. Verificar que la base de datos esté conectada
            console.log('\n🗄️ Verificando base de datos...');
            yield database_service_1.databaseService.connect();
            console.log('✅ Base de datos conectada');
            // 3. Simular un mensaje de WhatsApp
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
                                                body: 'Hola, esto es una prueba'
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
            // 4. Procesar el mensaje
            console.log('🔄 Procesando mensaje...');
            yield whatsapp_service_1.whatsappService.processWebhook(mockWebhookMessage);
            console.log('✅ Mensaje procesado exitosamente');
            // 5. Verificar que se creó la conversación
            console.log('\n🔍 Verificando conversación creada...');
            const conversation = yield database_service_1.databaseService.getOrCreateConversationByPhone('5512345678');
            if (conversation) {
                console.log('✅ Conversación encontrada/creada:', conversation.id);
            }
            else {
                console.log('❌ No se pudo crear/obtener conversación');
            }
            console.log('\n🎉 Prueba de procesamiento completada!');
        }
        catch (error) {
            console.error('❌ Error en la prueba:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testMessageProcessing()
        .then(() => {
        console.log('✅ Prueba de procesamiento completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en prueba:', error);
        process.exit(1);
    });
}
