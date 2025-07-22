const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Verificando conexión con Supabase...\n');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Variables de entorno:');
console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Configurada' : '❌ No configurada'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Configurada' : '❌ No configurada'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('\n🔌 Probando conexión...');
    
    // Test básico
    const { data, error } = await supabase
      .from('product_catalog_with_images')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error en conexión:', error);
      return;
    }
    
    console.log(`✅ Conexión exitosa. Registros en product_catalog_with_images: ${data}`);
    
    // Test de inserción simple
    console.log('\n📝 Probando inserción...');
    const { data: insertData, error: insertError } = await supabase
      .from('concepts_mapping')
      .insert({
        pieza: 'TEST',
        variantes: ['test'],
        is_active: true
      })
      .select();
    
    if (insertError) {
      console.error('❌ Error en inserción:', insertError);
      return;
    }
    
    console.log('✅ Inserción exitosa:', insertData);
    
    // Limpiar test
    if (insertData && insertData.length > 0) {
      await supabase
        .from('concepts_mapping')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test limpiado');
    }
    
    console.log('\n🎉 Todas las pruebas pasaron exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error inesperado:', error);
  }
}

testConnection(); 