const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrdering() {
  console.log('🔍 Probando ordenamiento de conversaciones por último mensaje...\n');

  try {
    // 1. Obtener conversaciones ordenadas por last_message_at
    console.log('📋 Obteniendo conversaciones ordenadas por last_message_at...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(10);

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
      return;
    }

    console.log(`✅ Encontradas ${conversations.length} conversaciones:`);
    
    // 2. Verificar el ordenamiento mostrando el último mensaje de cada conversación
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      console.log(`\n${i + 1}. Conversación ID: ${conv.id}`);
      console.log(`   Phone: ${conv.contact_phone}`);
      console.log(`   Last Message At: ${conv.last_message_at || 'Sin mensajes'}`);
      console.log(`   Updated At: ${conv.updated_at}`);
      
      // Obtener el último mensaje real para verificar
      const { data: lastMessage, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (msgError && msgError.code !== 'PGRST116') {
        console.error(`   ❌ Error obteniendo último mensaje:`, msgError);
      } else if (lastMessage) {
        console.log(`   ✅ Último mensaje real: ${lastMessage.created_at} - "${lastMessage.content.substring(0, 50)}..."`);
        
        // Verificar si el last_message_at coincide con el último mensaje real
        if (conv.last_message_at && lastMessage.created_at) {
          const lastMsgTime = new Date(conv.last_message_at).getTime();
          const realLastMsgTime = new Date(lastMessage.created_at).getTime();
          
          if (Math.abs(lastMsgTime - realLastMsgTime) < 1000) { // Tolerancia de 1 segundo
            console.log(`   ✅ last_message_at coincide con el último mensaje real`);
          } else {
            console.log(`   ⚠️ last_message_at NO coincide con el último mensaje real`);
            console.log(`      last_message_at: ${conv.last_message_at}`);
            console.log(`      último mensaje real: ${lastMessage.created_at}`);
          }
        }
      } else {
        console.log(`   📭 Sin mensajes en esta conversación`);
      }
    }

    // 3. Verificar que el ordenamiento sea correcto
    console.log('\n🔍 Verificando ordenamiento...');
    let isOrdered = true;
    for (let i = 0; i < conversations.length - 1; i++) {
      const current = conversations[i];
      const next = conversations[i + 1];
      
      const currentTime = current.last_message_at ? new Date(current.last_message_at).getTime() : 0;
      const nextTime = next.last_message_at ? new Date(next.last_message_at).getTime() : 0;
      
      if (currentTime < nextTime) {
        console.log(`   ❌ Orden incorrecto en posición ${i + 1}:`);
        console.log(`      Actual: ${current.last_message_at} (${current.contact_phone})`);
        console.log(`      Siguiente: ${next.last_message_at} (${next.contact_phone})`);
        isOrdered = false;
      }
    }
    
    if (isOrdered) {
      console.log('   ✅ El ordenamiento es correcto');
    } else {
      console.log('   ❌ El ordenamiento NO es correcto');
    }

    console.log('\n✅ Prueba de ordenamiento completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testOrdering(); 