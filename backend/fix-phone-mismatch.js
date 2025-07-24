const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPhoneMismatch() {
  console.log('🔧 Corrigiendo discrepancia de números de teléfono...\n');

  try {
    // 1. Verificar el estado actual
    console.log('📋 Estado actual:');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');

    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError);
      return;
    }

    console.log(`✅ Conversaciones: ${conversations.length}`);
    conversations.forEach(conv => {
      console.log(`  - ID: ${conv.id}, Phone: ${conv.contact_phone}`);
    });

    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*');

    if (contactsError) {
      console.error('❌ Error consultando contactos:', contactsError);
      return;
    }

    console.log(`✅ Contactos: ${contacts.length}`);
    contacts.forEach(contact => {
      console.log(`  - ID: ${contact.id}, Name: ${contact.name}, Phone: ${contact.phone}`);
    });

    // 2. Corregir números de teléfono en conversaciones
    console.log('\n🔧 Corrigiendo números de teléfono...');
    
    for (const conv of conversations) {
      let normalizedPhone = conv.contact_phone;
      
      // Normalizar el número (agregar + si no lo tiene)
      if (normalizedPhone && !normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }
      
      // Buscar contacto con este número
      const matchingContact = contacts.find(contact => {
        const contactPhone = contact.phone || contact.name;
        return contactPhone === normalizedPhone || contactPhone === conv.contact_phone;
      });
      
      if (matchingContact) {
        console.log(`📞 Conversación ${conv.id}: ${conv.contact_phone} -> ${matchingContact.phone}`);
        
        // Actualizar la conversación con el número correcto
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ contact_phone: matchingContact.phone })
          .eq('id', conv.id);
        
        if (updateError) {
          console.error(`❌ Error actualizando conversación ${conv.id}:`, updateError);
        } else {
          console.log(`  ✅ Conversación ${conv.id} actualizada`);
        }
      } else {
        console.log(`⚠️  No se encontró contacto para ${conv.contact_phone}`);
      }
    }

    // 3. Verificar el estado final
    console.log('\n📊 Estado final:');
    
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
        console.log(`  - ID: ${conv.id}, Phone: ${conv.contact_phone}, Contact: ${conv.contact?.name || 'Sin contacto'}`);
      });
    }

    console.log('\n✅ Corrección de números de teléfono completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixPhoneMismatch(); 