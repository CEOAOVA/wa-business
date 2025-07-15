// Script simple para probar la conexión con Supabase
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🧪 Probando conexión con Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'Configurada ✅' : 'NO configurada ❌');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Falta configuración de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n🔍 Probando consulta a tabla conversations...');
    const { data, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Error en consulta:', error.message);
      return false;
    }

    console.log(`✅ Conexión exitosa! Total conversaciones: ${count || 0}`);

    // Probar inserción de una conversación de prueba
    console.log('\n🧪 Probando inserción de conversación de prueba...');
    const { data: newConversation, error: insertError } = await supabase
      .from('conversations')
      .insert({
        contact_phone: '+1234567890-test',
        status: 'active',
        ai_mode: 'active',
        metadata: { test: true, created_by: 'test-script' }
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Error en inserción:', insertError.message);
      return false;
    }

    console.log(`✅ Conversación de prueba creada: ${newConversation.id}`);

    // Probar inserción de mensaje
    console.log('\n💬 Probando inserción de mensaje...');
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: newConversation.id,
        sender_type: 'bot',
        content: 'Mensaje de prueba desde script de test',
        message_type: 'text',
        metadata: { test: true }
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Error en mensaje:', messageError.message);
      return false;
    }

    console.log(`✅ Mensaje de prueba creado: ${newMessage.id}`);

    // Probar estadísticas
    console.log('\n📊 Probando consulta de estadísticas...');
    const [conversationsResult, messagesResult] = await Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ]);

    console.log(`📈 Total conversaciones: ${conversationsResult.count || 0}`);
    console.log(`💬 Total mensajes: ${messagesResult.count || 0}`);

    console.log('\n🎉 ¡Todas las pruebas de Supabase exitosas!');
    return true;

  } catch (error) {
    console.log('❌ Error inesperado:', error.message);
    return false;
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Supabase está funcionando correctamente!');
      console.log('🚀 Puedes usar: npm run dev');
    } else {
      console.log('\n❌ Hay problemas con Supabase');
      console.log('🔧 Revisa la configuración en .env');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.log('💥 Error fatal:', error);
    process.exit(1);
  }); 