const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleStructure() {
  console.log('🧪 Probando estructura simple (solo conversations y messages)...\n');

  try {
    // 1. Verificar conversaciones únicas
    console.log('📋 Conversaciones únicas:');
    
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

    // 2. Verificar mensajes por conversación
    console.log('💬 Mensajes por conversación:');
    
    for (const conv of conversations) {
      console.log(`📱 Conversación ${conv.id} (${conv.contact_phone}):`);
      
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
      contact: {
        id: conv.contact_phone,
        name: conv.contact_phone,
        phone: conv.contact_phone
      }
    }));

    console.log('✅ Conversaciones transformadas:');
    transformedConversations.forEach(conv => {
      console.log(`  - ID: ${conv.id}`);
      console.log(`    Contact: ${conv.contact.name}`);
      console.log(`    Phone: ${conv.contact.phone}`);
      console.log(`    Status: ${conv.status}`);
      console.log(`    Unread: ${conv.unread_count}`);
      console.log('');
    });

    console.log('✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSimpleStructure(); 