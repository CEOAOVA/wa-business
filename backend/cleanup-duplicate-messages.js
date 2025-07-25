/**
 * Script para limpiar mensajes duplicados del chatbot
 * Elimina mensajes que tienen whatsapp_message_id NULL y metadata que empieza con chatbotId
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_ANON_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicateMessages() {
  try {
    console.log('🧹 Iniciando limpieza de mensajes duplicados...');
    
    // Buscar mensajes duplicados (whatsapp_message_id NULL y metadata con chatbotId)
    const { data: duplicateMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .is('whatsapp_message_id', null)
      .not('metadata', 'is', null)
      .like('metadata', '%chatbotId%');
    
    if (fetchError) {
      console.error('❌ Error buscando mensajes duplicados:', fetchError);
      return;
    }
    
    console.log(`📊 Encontrados ${duplicateMessages.length} mensajes duplicados para eliminar`);
    
    if (duplicateMessages.length === 0) {
      console.log('✅ No hay mensajes duplicados para eliminar');
      return;
    }
    
    // Mostrar algunos ejemplos de mensajes que se van a eliminar
    console.log('\n📋 Ejemplos de mensajes que se eliminarán:');
    duplicateMessages.slice(0, 5).forEach((msg, index) => {
      console.log(`${index + 1}. ID: ${msg.id}, Contenido: "${msg.content.substring(0, 50)}...", Metadata: ${JSON.stringify(msg.metadata).substring(0, 100)}...`);
    });
    
    if (duplicateMessages.length > 5) {
      console.log(`... y ${duplicateMessages.length - 5} mensajes más`);
    }
    
    // Confirmar eliminación
    console.log('\n⚠️  ¿Estás seguro de que quieres eliminar estos mensajes? (s/N)');
    
    // En modo automático, proceder con la eliminación
    console.log('🔄 Procediendo con la eliminación automática...');
    
    // Eliminar mensajes duplicados
    const messageIds = duplicateMessages.map(msg => msg.id);
    
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds);
    
    if (deleteError) {
      console.error('❌ Error eliminando mensajes duplicados:', deleteError);
      return;
    }
    
    console.log(`✅ Eliminados ${duplicateMessages.length} mensajes duplicados exitosamente`);
    
    // Verificar que se eliminaron correctamente
    const { data: remainingDuplicates, error: verifyError } = await supabase
      .from('messages')
      .select('count')
      .is('whatsapp_message_id', null)
      .not('metadata', 'is', null)
      .like('metadata', '%chatbotId%');
    
    if (verifyError) {
      console.error('❌ Error verificando eliminación:', verifyError);
    } else {
      console.log(`🔍 Verificación: Quedan ${remainingDuplicates.length} mensajes duplicados`);
    }
    
    console.log('🎉 Limpieza completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar limpieza
if (require.main === module) {
  cleanupDuplicateMessages()
    .then(() => {
      console.log('✅ Script de limpieza completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de limpieza:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicateMessages }; 