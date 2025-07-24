const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Variables de entorno:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Configurado' : 'No configurado');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Configurado' : 'No configurado');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestMessages() {
  try {
    console.log('🔍 Obteniendo conversaciones existentes...');
    
    // Obtener conversaciones existentes
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .limit(5);

    if (convError) {
      console.error('❌ Error obteniendo conversaciones:', convError);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('❌ No hay conversaciones para insertar mensajes');
      return;
    }

    console.log(`✅ Encontradas ${conversations.length} conversaciones`);

    // Mensajes de prueba para cada conversación
    const testMessages = [
      {
        sender_type: 'user',
        content: 'Hola, necesito ayuda con mi auto',
        message_type: 'text'
      },
      {
        sender_type: 'agent',
        content: '¡Hola! Te ayudo con gusto. ¿Qué problema tienes con tu auto?',
        message_type: 'text'
      },
      {
        sender_type: 'user',
        content: 'No enciende, creo que es la batería',
        message_type: 'text'
      },
      {
        sender_type: 'agent',
        content: 'Entiendo. ¿Qué marca y modelo es tu auto? Así puedo ayudarte mejor.',
        message_type: 'text'
      },
      {
        sender_type: 'user',
        content: 'Es un Toyota Corolla 2018',
        message_type: 'text'
      },
      {
        sender_type: 'agent',
        content: 'Perfecto. Para un Toyota Corolla 2018 tenemos varias opciones de batería. ¿Te gustaría que te ayude a encontrar la más adecuada?',
        message_type: 'text'
      }
    ];

    // Insertar mensajes para cada conversación
    for (const conversation of conversations) {
      console.log(`📨 Insertando mensajes para conversación ${conversation.id}...`);
      
      const messagesToInsert = testMessages.map((msg, index) => ({
        conversation_id: conversation.id,
        sender_type: msg.sender_type,
        content: msg.content,
        message_type: msg.message_type,
        is_read: msg.sender_type === 'agent',
        created_at: new Date(Date.now() - (testMessages.length - index) * 60000).toISOString(), // 1 minuto entre mensajes
        updated_at: new Date().toISOString()
      }));

      const { data: insertedMessages, error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert)
        .select();

      if (insertError) {
        console.error(`❌ Error insertando mensajes para conversación ${conversation.id}:`, insertError);
      } else {
        console.log(`✅ ${insertedMessages.length} mensajes insertados para conversación ${conversation.id}`);
      }
    }

    console.log('✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

// Ejecutar el script
insertTestMessages(); 