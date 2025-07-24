const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Verificando esquema de la base de datos...\n');

  try {
    // Verificar estructura de la tabla conversations
    console.log('📋 Verificando tabla conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (convError) {
      console.error('❌ Error consultando conversations:', convError);
    } else {
      console.log('✅ Estructura de conversations:');
      if (conversations.length > 0) {
        const columns = Object.keys(conversations[0]);
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof conversations[0][col]}`);
        });
      } else {
        console.log('  (tabla vacía)');
      }
    }

    // Verificar estructura de la tabla contacts
    console.log('\n👥 Verificando tabla contacts...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(1);

    if (contactsError) {
      console.error('❌ Error consultando contacts:', contactsError);
    } else {
      console.log('✅ Estructura de contacts:');
      if (contacts.length > 0) {
        const columns = Object.keys(contacts[0]);
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof contacts[0][col]}`);
        });
      } else {
        console.log('  (tabla vacía)');
      }
    }

    // Verificar estructura de la tabla messages
    console.log('\n💬 Verificando tabla messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (messagesError) {
      console.error('❌ Error consultando messages:', messagesError);
    } else {
      console.log('✅ Estructura de messages:');
      if (messages.length > 0) {
        const columns = Object.keys(messages[0]);
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof messages[0][col]}`);
        });
      } else {
        console.log('  (tabla vacía)');
      }
    }

    // Verificar datos actuales
    console.log('\n📊 Datos actuales:');
    
    const { data: allConversations, error: allConvError } = await supabase
      .from('conversations')
      .select('*');

    if (allConvError) {
      console.error('❌ Error consultando todas las conversaciones:', allConvError);
    } else {
      console.log(`✅ Conversaciones totales: ${allConversations.length}`);
      allConversations.forEach(conv => {
        console.log(`  - ID: ${conv.id}`);
        Object.keys(conv).forEach(key => {
          console.log(`    ${key}: ${conv[key]}`);
        });
        console.log('');
      });
    }

    const { data: allContacts, error: allContactsError } = await supabase
      .from('contacts')
      .select('*');

    if (allContactsError) {
      console.error('❌ Error consultando todos los contactos:', allContactsError);
    } else {
      console.log(`✅ Contactos totales: ${allContacts.length}`);
      allContacts.forEach(contact => {
        console.log(`  - ID: ${contact.id}, Name: ${contact.name}`);
        Object.keys(contact).forEach(key => {
          console.log(`    ${key}: ${contact[key]}`);
        });
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkSchema(); 