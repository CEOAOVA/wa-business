const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

async function testEndpoint() {
  console.log('🧪 Probando endpoint de conversaciones públicas...\n');

  try {
    // Primero obtener un token de autenticación
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'moises.s@aova.mx',
      password: 'aova2024_temp'
    });

    const loginData = loginResponse.data;
    
    if (!loginData.success) {
      console.error('❌ Error en login:', loginData);
      return;
    }

    console.log('✅ Login exitoso, token obtenido');

    // Probar el endpoint de conversaciones públicas
    const conversationsResponse = await axios.get('http://localhost:3002/api/dashboard/conversations/public', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    const conversationsData = conversationsResponse.data;
    
    console.log('📋 Respuesta del endpoint:');
    console.log('Status:', conversationsResponse.status);
    console.log('Success:', conversationsData.success);
    
    if (conversationsData.success) {
      console.log(`✅ ${conversationsData.data.length} conversaciones obtenidas:`);
      conversationsData.data.forEach((conv, index) => {
        console.log(`  ${index + 1}. ID: ${conv.id}`);
        console.log(`     Contact ID: ${conv.contact_id}`);
        console.log(`     Status: ${conv.status}`);
        console.log(`     Priority: ${conv.priority}`);
        console.log(`     Contact: ${conv.contact ? conv.contact.name : 'Sin contacto'}`);
        console.log(`     Phone: ${conv.contact ? conv.contact.phone_number : 'Sin teléfono'}`);
        console.log('');
      });
    } else {
      console.error('❌ Error:', conversationsData.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testEndpoint(); 