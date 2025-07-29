import { whatsappService } from '../services/whatsapp.service';
import { databaseService } from '../services/database.service';

/**
 * Script para simular un webhook de WhatsApp y ver el procesamiento completo
 */
async function testWhatsAppWebhook(): Promise<void> {
  console.log('🧪 Simulando webhook de WhatsApp...\n');

  try {
    // 1. Inicializar servicios
    console.log('📱 Inicializando servicios...');
    await whatsappService.initialize();
    await databaseService.connect();
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
    await whatsappService.processWebhook(mockWebhookMessage);
    console.log('✅ Webhook procesado');

    // 4. Verificar conversación creada
    console.log('\n🔍 Verificando conversación...');
    const conversation = await databaseService.getOrCreateConversationByPhone('5512345678');
    if (conversation) {
      console.log('✅ Conversación encontrada:', conversation.id);
      console.log(`  Estado: ${conversation.status}`);
      console.log(`  AI Mode: ${conversation.ai_mode}`);
      console.log(`  Takeover Mode: ${conversation.takeover_mode}`);
    } else {
      console.log('❌ No se pudo crear/obtener conversación');
    }

    // 5. Verificar mensajes creados
    console.log('\n📋 Verificando mensajes...');
    if (conversation) {
      const messages = await databaseService.getConversationMessages(conversation.id, 10);
      console.log(`✅ ${messages.length} mensajes encontrados:`);
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
      });
    }

    console.log('\n🎉 Prueba de webhook completada!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  }
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

export { testWhatsAppWebhook };