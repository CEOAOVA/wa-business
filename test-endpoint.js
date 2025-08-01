/**
 * Script de prueba para verificar el endpoint /api/chat/send
 */

const BACKEND_URL = 'http://localhost:3001'; // Ajusta según tu configuración

async function testSendMessage() {
  console.log('🧪 Probando endpoint /api/chat/send...');
  
  try {
    // Primero necesitamos obtener un token de autenticación
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@embler.com', // Ajusta según tus credenciales
        password: 'admin123' // Ajusta según tus credenciales
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Error en login:', loginResponse.status, loginResponse.statusText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login exitoso:', loginData.success);
    
    if (!loginData.data?.session?.access_token) {
      console.error('❌ No se obtuvo token de acceso');
      return;
    }

    const token = loginData.data.session.access_token;
    console.log('🔐 Token obtenido:', token.substring(0, 20) + '...');

    // Ahora probamos el endpoint de envío de mensajes
    const sendMessageResponse = await fetch(`${BACKEND_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: '525512345678', // Número de prueba
        message: 'Mensaje de prueba desde script',
        clientId: `test_${Date.now()}`
      })
    });

    console.log('📤 Status de respuesta:', sendMessageResponse.status);
    
    if (sendMessageResponse.ok) {
      const result = await sendMessageResponse.json();
      console.log('✅ Mensaje enviado exitosamente:', result);
    } else {
      const errorText = await sendMessageResponse.text();
      console.error('❌ Error enviando mensaje:', sendMessageResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar la prueba
testSendMessage(); 