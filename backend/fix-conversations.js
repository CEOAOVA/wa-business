const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConversations() {
  console.log('🔧 Iniciando corrección de conversaciones...\n');

  try {
    // 1. Verificar el estado actual
    console.log('📋 Estado actual de la base de datos:');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
      return;
    }

    console.log(`✅ Encontradas ${conversations.length} conversaciones`);

    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*');

    if (contactsError) {
      console.error('❌ Error consultando contactos:', contactsError);
      return;
    }

    console.log(`✅ Encontrados ${contacts.length} contactos`);

    // 2. Identificar contactos duplicados por número de teléfono
    console.log('\n🔍 Identificando contactos duplicados...');
    
    const phoneGroups = {};
    contacts.forEach(contact => {
      const phone = contact.phone_number || contact.name; // Usar name como fallback
      if (!phoneGroups[phone]) {
        phoneGroups[phone] = [];
      }
      phoneGroups[phone].push(contact);
    });

    const duplicates = Object.entries(phoneGroups).filter(([phone, contacts]) => contacts.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Encontrados ${duplicates.length} números con contactos duplicados:`);
      duplicates.forEach(([phone, contacts]) => {
        console.log(`  📞 ${phone}: ${contacts.length} contactos`);
        contacts.forEach(contact => {
          console.log(`    - ID: ${contact.id}, Name: ${contact.name}, Created: ${contact.created_at}`);
        });
      });
    } else {
      console.log('✅ No hay contactos duplicados');
    }

    // 3. Para cada número duplicado, mantener solo el contacto más reciente
    console.log('\n🧹 Limpiando contactos duplicados...');
    
    for (const [phone, contacts] of duplicates) {
      // Ordenar por fecha de creación (más reciente primero)
      contacts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const keepContact = contacts[0]; // El más reciente
      const deleteContacts = contacts.slice(1); // Los demás
      
      console.log(`📞 Para ${phone}: manteniendo ${keepContact.name} (${keepContact.id})`);
      
      // Actualizar conversaciones que usan los contactos a eliminar
      for (const deleteContact of deleteContacts) {
        console.log(`  🔄 Actualizando conversaciones de ${deleteContact.name} (${deleteContact.id}) a ${keepContact.name} (${keepContact.id})`);
        
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ contact_id: keepContact.id })
          .eq('contact_id', deleteContact.id);
        
        if (updateError) {
          console.error(`❌ Error actualizando conversaciones para ${deleteContact.id}:`, updateError);
        } else {
          console.log(`  ✅ Conversaciones actualizadas para ${deleteContact.id}`);
        }
        
        // Eliminar el contacto duplicado
        const { error: deleteError } = await supabase
          .from('contacts')
          .delete()
          .eq('id', deleteContact.id);
        
        if (deleteError) {
          console.error(`❌ Error eliminando contacto ${deleteContact.id}:`, deleteError);
        } else {
          console.log(`  ✅ Contacto ${deleteContact.id} eliminado`);
        }
      }
    }

    // 4. Verificar el estado final
    console.log('\n📊 Estado final de la base de datos:');
    
    const { data: finalConversations, error: finalConvError } = await supabase
      .from('conversations')
      .select('*');

    if (finalConvError) {
      console.error('❌ Error consultando conversaciones finales:', finalConvError);
    } else {
      console.log(`✅ Conversaciones finales: ${finalConversations.length}`);
      finalConversations.forEach(conv => {
        console.log(`  - ID: ${conv.id}, Contact ID: ${conv.contact_id}, Status: ${conv.status}`);
      });
    }

    const { data: finalContacts, error: finalContactsError } = await supabase
      .from('contacts')
      .select('*');

    if (finalContactsError) {
      console.error('❌ Error consultando contactos finales:', finalContactsError);
    } else {
      console.log(`✅ Contactos finales: ${finalContacts.length}`);
      finalContacts.forEach(contact => {
        console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone_number || contact.name}`);
      });
    }

    console.log('\n✅ Corrección completada exitosamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixConversations(); 