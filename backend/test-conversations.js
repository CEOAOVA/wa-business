const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversations() {
  console.log('🔍 Verificando conversaciones en la base de datos...\n');

  try {
    // Verificar conversaciones
    console.log('📋 Verificando tabla conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(10);

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
    } else {
      console.log(`✅ Encontradas ${conversations.length} conversaciones:`);
      conversations.forEach(conv => {
        console.log(`  - ID: ${conv.id}, Contact: ${conv.contact_id}, Status: ${conv.status}, Created: ${conv.created_at}`);
      });
    }

    // Verificar contactos
    console.log('\n👥 Verificando tabla contacts...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(10);

    if (contactsError) {
      console.error('❌ Error consultando contactos:', contactsError);
    } else {
      console.log(`✅ Encontrados ${contacts.length} contactos:`);
      contacts.forEach(contact => {
        console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone_number}, Created: ${contact.created_at}`);
      });
    }

    // Verificar mensajes
    console.log('\n💬 Verificando tabla messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(10);

    if (messagesError) {
      console.error('❌ Error consultando mensajes:', messagesError);
    } else {
      console.log(`✅ Encontrados ${messages.length} mensajes:`);
      messages.forEach(msg => {
        console.log(`  - ID: ${msg.id}, Conv: ${msg.conversation_id}, Sender: ${msg.sender_type}, Content: ${msg.content.substring(0, 50)}...`);
      });
    }

    // Verificar agentes
    console.log('\n👨‍💼 Verificando tabla agents...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .limit(10);

    if (agentsError) {
      console.error('❌ Error consultando agentes:', agentsError);
    } else {
      console.log(`✅ Encontrados ${agents.length} agentes:`);
      agents.forEach(agent => {
        console.log(`  - ID: ${agent.id}, Name: ${agent.name}, Email: ${agent.email}, Role: ${agent.role}`);
      });
    }

    // Crear datos de prueba si no hay conversaciones
    if (conversations.length === 0) {
      console.log('\n🧪 No hay conversaciones. Creando datos de prueba...');
      
      // Crear un contacto de prueba
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: 'Cliente de Prueba',
          phone_number: '525512345678',
          email: 'cliente@test.com',
          metadata: { source: 'test' }
        })
        .select()
        .single();

      if (contactError) {
        console.error('❌ Error creando contacto de prueba:', contactError);
      } else {
        console.log('✅ Contacto de prueba creado:', newContact);

        // Crear una conversación de prueba
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            contact_id: newContact.id,
            status: 'open',
            priority: 'medium',
            metadata: { source: 'test' }
          })
          .select()
          .single();

        if (convError) {
          console.error('❌ Error creando conversación de prueba:', convError);
        } else {
          console.log('✅ Conversación de prueba creada:', newConversation);

          // Crear mensajes de prueba
          const testMessages = [
            {
              conversation_id: newConversation.id,
              sender_type: 'user',
              content: 'Hola, necesito información sobre repuestos para mi auto',
              message_type: 'text',
              metadata: { source: 'test' }
            },
            {
              conversation_id: newConversation.id,
              sender_type: 'agent',
              content: '¡Hola! Con gusto te ayudo. ¿Qué marca y modelo es tu auto?',
              message_type: 'text',
              metadata: { source: 'test' }
            },
            {
              conversation_id: newConversation.id,
              sender_type: 'user',
              content: 'Es un Honda Civic 2020',
              message_type: 'text',
              metadata: { source: 'test' }
            }
          ];

          const { data: newMessages, error: messagesError } = await supabase
            .from('messages')
            .insert(testMessages)
            .select();

          if (messagesError) {
            console.error('❌ Error creando mensajes de prueba:', messagesError);
          } else {
            console.log(`✅ ${newMessages.length} mensajes de prueba creados`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testConversations(); 