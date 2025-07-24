const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewStructure() {
  console.log('🧪 Probando nueva estructura de conversaciones...\n');

  try {
    // 1. Verificar conversaciones
    console.log('📋 Conversaciones:');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
      return;
    }

    console.log(`✅ Encontradas ${conversations.length} conversaciones:`);
    conversations.forEach(conv => {
      console.log(`  - ID: ${conv.id}`);
      console.log(`    Phone: ${conv.contact_phone}`);
      console.log(`    Status: ${conv.status}`);
      console.log(`    AI Mode: ${conv.ai_mode}`);
      console.log(`    Unread: ${conv.unread_count}`);
      console.log(`    Last Message: ${conv.last_message_at}`);
      console.log('');
    });

    // 2. Obtener contactos
    console.log('👥 Contactos:');
    
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*');

    if (contactsError) {
      console.error('❌ Error consultando contactos:', contactsError);
      return;
    }

    console.log(`✅ Encontrados ${contacts.length} contactos:`);
    contacts.forEach(contact => {
      console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone}`);
    });

    // Crear mapa de contactos por número de teléfono
    const contactsMap = new Map();
    contacts.forEach(contact => {
      contactsMap.set(contact.phone, contact);
    });

    // 3. Verificar mensajes de cada conversación
    console.log('\n💬 Mensajes por conversación:');
    
    for (const conv of conversations) {
      const contact = contactsMap.get(conv.contact_phone);
      console.log(`📱 Conversación ${conv.id} (${contact?.name || 'Sin nombre'}):`);
      
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error(`❌ Error consultando mensajes para ${conv.id}:`, messagesError);
      } else {
        console.log(`  ${messages.length} mensajes:`);
        messages.forEach(msg => {
          console.log(`    - ${msg.sender_type}: ${msg.content.substring(0, 50)}... (${msg.created_at})`);
        });
      }
      console.log('');
    }

    // 3. Simular la respuesta que enviaría el backend
    console.log('🔄 Simulando respuesta del backend:');
    
    const transformedConversations = conversations.map(conv => ({
      id: conv.id,
      contact_phone: conv.contact_phone,
      status: conv.status,
      ai_mode: conv.ai_mode,
      assigned_agent_id: conv.assigned_agent_id,
      unread_count: conv.unread_count,
      last_message_at: conv.last_message_at,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      contact: conv.contact
    }));

    console.log('✅ Conversaciones transformadas:');
    transformedConversations.forEach(conv => {
      console.log(`  - ID: ${conv.id}`);
      console.log(`    Contact: ${conv.contact?.name || 'Sin nombre'}`);
      console.log(`    Phone: ${conv.contact?.phone || conv.contact_phone}`);
      console.log(`    Status: ${conv.status}`);
      console.log(`    Unread: ${conv.unread_count}`);
      console.log('');
    });

    console.log('✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testNewStructure(); 