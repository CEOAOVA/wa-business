import { supabaseAdmin } from '../config/supabase';

async function testConversations() {
  console.log('🔍 [Test] Verificando tabla conversations...');
  
  if (!supabaseAdmin) {
    console.error('❌ [Test] SupabaseAdmin no está disponible');
    return;
  }
  
  try {
    // Verificar si la tabla existe
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'conversations');

    if (tablesError) {
      console.error('❌ [Test] Error verificando tabla:', tablesError);
      return;
    }

    console.log('🔍 [Test] Tabla conversations existe:', tables.length > 0);

    if (tables.length === 0) {
      console.log('❌ [Test] La tabla conversations NO existe');
      return;
    }

    // Obtener todas las conversaciones
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .limit(10);

    if (convError) {
      console.error('❌ [Test] Error obteniendo conversaciones:', convError);
      return;
    }

    console.log('🔍 [Test] Conversaciones encontradas:', conversations?.length || 0);
    
    if (conversations && conversations.length > 0) {
      console.log('🔍 [Test] Primera conversación:', conversations[0]);
      console.log('🔍 [Test] Estructura de la conversación:', Object.keys(conversations[0]));
    } else {
      console.log('🔍 [Test] No hay conversaciones en la base de datos');
    }

    // Verificar estructura de la tabla
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'conversations');

    if (columnsError) {
      console.error('❌ [Test] Error obteniendo columnas:', columnsError);
      return;
    }

    console.log('🔍 [Test] Columnas de la tabla conversations:');
    columns?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ [Test] Error general:', error);
  }
}

// Ejecutar el test
testConversations().then(() => {
  console.log('✅ [Test] Completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ [Test] Error:', error);
  process.exit(1);
}); 