import { databaseService } from '../services/database.service';

/**
 * Script para probar la creación de mensajes y verificar que el error se ha corregido
 */
async function testMessageCreation(): Promise<void> {
  console.log('🧪 Probando creación de mensajes...\n');

  try {
    // 1. Conectar a la base de datos
    console.log('🗄️ Conectando a la base de datos...');
    await databaseService.connect();
    console.log('✅ Base de datos conectada');

    // 2. Crear una conversación de prueba
    console.log('\n📝 Creando conversación de prueba...');
    const conversation = await databaseService.getOrCreateConversationByPhone('5512345678');
    if (!conversation) {
      console.log('❌ No se pudo crear conversación');
      return;
    }
    console.log('✅ Conversación creada:', conversation.id);

    // 3. Crear un mensaje del usuario
    console.log('\n📨 Creando mensaje del usuario...');
    const userMessage = await databaseService.createMessage({
      conversationId: conversation.id,
      senderType: 'user',
      content: 'Hola, esto es una prueba',
      messageType: 'text',
      whatsappMessageId: 'msg-test-user-123'
    });

    if (userMessage) {
      console.log('✅ Mensaje del usuario creado:', userMessage.id);
    } else {
      console.log('❌ Error creando mensaje del usuario');
    }

    // 4. Crear un mensaje del bot
    console.log('\n🤖 Creando mensaje del bot...');
    const botMessage = await databaseService.createMessage({
      conversationId: conversation.id,
      senderType: 'bot',
      content: 'Hola! ¿En qué puedo ayudarte?',
      messageType: 'text',
      whatsappMessageId: 'msg-test-bot-123'
    });

    if (botMessage) {
      console.log('✅ Mensaje del bot creado:', botMessage.id);
    } else {
      console.log('❌ Error creando mensaje del bot');
    }

    // 5. Verificar mensajes creados
    console.log('\n📋 Verificando mensajes creados...');
    const messages = await databaseService.getConversationMessages(conversation.id, 10);
    console.log(`✅ ${messages.length} mensajes encontrados:`);
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
    });

    // 6. Verificar conversación actualizada
    console.log('\n🔍 Verificando conversación actualizada...');
    const updatedConversation = await databaseService.getOrCreateConversationByPhone('5512345678');
    if (updatedConversation) {
      console.log('✅ Conversación actualizada:');
      console.log(`  Unread count: ${updatedConversation.unread_count}`);
      console.log(`  Last message at: ${updatedConversation.last_message_at}`);
    }

    console.log('\n🎉 Prueba de creación de mensajes completada!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  }
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

export { testMessageCreation };