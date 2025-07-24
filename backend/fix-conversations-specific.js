const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConversationsSpecific() {
  console.log('🔧 Iniciando corrección específica de conversaciones...\n');

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

    // 2. Identificar contactos duplicados por número de teléfono (en el campo name)
    console.log('\n🔍 Identificando contactos duplicados por número de teléfono...');
    
    // Extraer números de teléfono del campo name
    const phoneContacts = contacts.filter(contact => {
      const name = contact.name || '';
      // Buscar patrones de números de teléfono
      return /^\+?52\d{10}$/.test(name) || /^52\d{10}$/.test(name);
    });

    console.log(`📞 Contactos con números de teléfono: ${phoneContacts.length}`);
    phoneContacts.forEach(contact => {
      console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Created: ${contact.created_at}`);
    });

    // Agrupar por número de teléfono (normalizado)
    const phoneGroups = {};
    phoneContacts.forEach(contact => {
      let phone = contact.name;
      // Normalizar el número (quitar + si existe)
      if (phone.startsWith('+')) {
        phone = phone.substring(1);
      }
      
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
      console.log('✅ No hay contactos duplicados por número de teléfono');
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

    // 4. Asignar contact_id a la conversación si no tiene uno
    console.log('\n🔗 Asignando contact_id a conversaciones sin contacto...');
    
    const { data: conversationsWithoutContact, error: convWithoutError } = await supabase
      .from('conversations')
      .select('*')
      .is('contact_id', null);

    if (convWithoutError) {
      console.error('❌ Error consultando conversaciones sin contacto:', convWithoutError);
    } else if (conversationsWithoutContact.length > 0) {
      console.log(`⚠️  Encontradas ${conversationsWithoutContact.length} conversaciones sin contact_id`);
      
      // Obtener el contacto más reciente para asignar
      const { data: latestContact, error: latestContactError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestContactError) {
        console.error('❌ Error obteniendo contacto más reciente:', latestContactError);
      } else if (latestContact) {
        console.log(`📞 Asignando contacto ${latestContact.name} (${latestContact.id}) a conversaciones sin contacto`);
        
        for (const conv of conversationsWithoutContact) {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ contact_id: latestContact.id })
            .eq('id', conv.id);
          
          if (updateError) {
            console.error(`❌ Error actualizando conversación ${conv.id}:`, updateError);
          } else {
            console.log(`  ✅ Conversación ${conv.id} actualizada`);
          }
        }
      }
    } else {
      console.log('✅ Todas las conversaciones tienen contact_id asignado');
    }

    // 5. Verificar el estado final
    console.log('\n📊 Estado final de la base de datos:');
    
    const { data: finalConversations, error: finalConvError } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*)
      `);

    if (finalConvError) {
      console.error('❌ Error consultando conversaciones finales:', finalConvError);
    } else {
      console.log(`✅ Conversaciones finales: ${finalConversations.length}`);
      finalConversations.forEach(conv => {
        console.log(`  - ID: ${conv.id}, Contact: ${conv.contact?.name || 'Sin contacto'}, Status: ${conv.status}`);
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
        console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone_number || 'N/A'}`);
      });
    }

    console.log('\n✅ Corrección específica completada exitosamente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixConversationsSpecific(); 