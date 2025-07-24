const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationsFixed() {
  console.log('🔍 Verificando conversaciones y mensajes en la base de datos...\n');

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
        console.log(`  - ID: ${conv.id}, Phone: ${conv.contact_phone}, Status: ${conv.status}, Created: ${conv.created_at}`);
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
        console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone}, Created: ${contact.created_at}`);
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

    // Probar consulta con JOIN para obtener conversaciones con contactos
    console.log('\n🔗 Probando consulta con JOIN (conversaciones + contactos)...');
    const { data: conversationsWithContacts, error: joinError } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts!conversations_contact_phone_fkey(*)
      `)
      .limit(5);

    if (joinError) {
      console.error('❌ Error en consulta JOIN:', joinError);
    } else {
      console.log(`✅ Encontradas ${conversationsWithContacts.length} conversaciones con contactos:`);
      conversationsWithContacts.forEach(conv => {
        console.log(`  - Conv ID: ${conv.id}, Phone: ${conv.contact_phone}`);
        console.log(`    Contact: ${conv.contact ? `${conv.contact.name} (${conv.contact.phone})` : 'Sin contacto'}`);
      });
    }

    // Probar consulta de mensajes para una conversación específica
    if (conversations.length > 0) {
      const testConversationId = conversations[0].id;
      console.log(`\n📨 Probando mensajes para conversación: ${testConversationId}`);
      
      const { data: conversationMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', testConversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('❌ Error consultando mensajes de conversación:', msgError);
      } else {
        console.log(`✅ Encontrados ${conversationMessages.length} mensajes para la conversación:`);
        conversationMessages.forEach(msg => {
          console.log(`  - ${msg.sender_type}: ${msg.content.substring(0, 100)}...`);
        });
      }
    }

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testConversationsFixed(); 