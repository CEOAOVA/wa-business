const axios = require('axios');

// Configuración de WhatsApp Business API
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAVaa8losBABPPPp3JWQnqFEP7OK1Y2D9kosZAj103ue4lNmlOLbfQWtrlXgSkCgKhzvkbZAlzdEahm7ZCZA1yuJg40HgoMPda5GJZA0DnbWE2GSSMrbMC9T5XkLZAfsjssrp5dU0TePiqs8KzxoOKmuZAhZBpPyuQzTX06ZAQtwxKiILd1oy36a8GCTtSWvFrLxMtQZDZD';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '748017128384316';
const WHATSAPP_API_VERSION = 'v22.0';
const WHATSAPP_BASE_URL = 'https://graph.facebook.com';

// Números de teléfono a probar
const phoneNumbers = [
  "5549679734",
  "525549679734", 
  "5215549679734",
  "+525549679734",
  "+5215549679734"
];

// Función para construir la URL de la API
function buildApiUrl(endpoint) {
  return `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${endpoint}`;
}

// Función para obtener headers
function getHeaders() {
  return {
    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// Función para enviar mensaje
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const url = buildApiUrl(`${WHATSAPP_PHONE_NUMBER_ID}/messages`);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log(`📤 Enviando mensaje a ${phoneNumber}: "${message}"`);
    
    const response = await axios.post(url, payload, {
      headers: getHeaders()
    });

    console.log(`✅ Mensaje enviado exitosamente a ${phoneNumber}`);
    console.log(`   Message ID: ${response.data.messages?.[0]?.id}`);
    
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      data: response.data
    };
    
  } catch (error) {
    console.error(`❌ Error enviando mensaje a ${phoneNumber}:`);
    console.error(`   Error: ${error.response?.data?.error?.message || error.message}`);
    
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      details: error.response?.data
    };
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando envío de mensajes WhatsApp...\n');
  
  // Verificar configuración
  if (WHATSAPP_ACCESS_TOKEN === 'tu_token_aqui' || WHATSAPP_PHONE_NUMBER_ID === 'tu_phone_number_id_aqui') {
    console.error('❌ Error: Debes configurar las variables de entorno:');
    console.error('   WHATSAPP_ACCESS_TOKEN');
    console.error('   WHATSAPP_PHONE_NUMBER_ID');
    console.error('\nO modificar los valores por defecto en el script.');
    return;
  }
  
  console.log('✅ Configuración verificada:');
  console.log(`   Token: ${WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);
  console.log(`   Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}`);
  console.log('');
  
  console.log('📋 Números a probar:');
  phoneNumbers.forEach((number, index) => {
    console.log(`   ${index + 1}. ${number}`);
  });
  console.log('');
  
  // Enviar mensajes a cada número
  for (const phoneNumber of phoneNumbers) {
    const message = `Mensaje de prueba usando variación: ${phoneNumber}`;
    
    const result = await sendWhatsAppMessage(phoneNumber, message);
    
    if (result.success) {
      console.log(`✅ ${phoneNumber} - ENVIADO`);
    } else {
      console.log(`❌ ${phoneNumber} - FALLÓ`);
    }
    
    console.log(''); // Línea en blanco para separar resultados
    
    // Esperar 2 segundos entre envíos para evitar rate limiting
    if (phoneNumber !== phoneNumbers[phoneNumbers.length - 1]) {
      console.log('⏳ Esperando 2 segundos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('');
    }
  }
  
  console.log('🎉 Proceso completado!');
}

// Ejecutar el script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { sendWhatsAppMessage, phoneNumbers }; 