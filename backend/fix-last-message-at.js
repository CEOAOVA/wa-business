const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLastMessageAt() {
  console.log('🔧 Corrigiendo campo last_message_at en conversaciones...\n');

  try {
    // 1. Obtener todas las conversaciones
    console.log('📋 Obteniendo conversaciones...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
      return;
    }

    console.log(`✅ Encontradas ${conversations.length} conversaciones`);

    // 2. Para cada conversación, obtener el último mensaje y actualizar last_message_at
    let updatedCount = 0;
    let errorCount = 0;

    for (const conv of conversations) {
      console.log(`\n🔍 Procesando conversación: ${conv.id} (${conv.contact_phone})`);
      
      // Obtener el último mensaje de la conversación
      const { data: lastMessage, error: msgError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (msgError && msgError.code !== 'PGRST116') {
        console.error(`   ❌ Error obteniendo último mensaje:`, msgError);
        errorCount++;
        continue;
      }

      if (!lastMessage) {
        console.log(`   📭 Sin mensajes en esta conversación`);
        continue;
      }

      const lastMessageTime = lastMessage.created_at;
      const currentLastMessageAt = conv.last_message_at;

      // Verificar si necesita actualización
      if (!currentLastMessageAt || new Date(currentLastMessageAt).getTime() !== new Date(lastMessageTime).getTime()) {
        console.log(`   🔄 Actualizando last_message_at:`);
        console.log(`      Actual: ${currentLastMessageAt || 'null'}`);
        console.log(`      Nuevo: ${lastMessageTime}`);

        // Actualizar la conversación
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            last_message_at: lastMessageTime,
            updated_at: lastMessageTime
          })
          .eq('id', conv.id);

        if (updateError) {
          console.error(`   ❌ Error actualizando conversación:`, updateError);
          errorCount++;
        } else {
          console.log(`   ✅ Conversación actualizada correctamente`);
          updatedCount++;
        }
      } else {
        console.log(`   ✅ last_message_at ya está correcto: ${currentLastMessageAt}`);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Conversaciones actualizadas: ${updatedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📭 Sin cambios necesarios: ${conversations.length - updatedCount - errorCount}`);

    console.log('\n✅ Corrección completada');

  } catch (error) {
    console.error('❌ Error en la corrección:', error);
  }
}

fixLastMessageAt(); 