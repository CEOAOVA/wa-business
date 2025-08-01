/**
 * Script de prueba para verificar el envío de mensajes de WhatsApp
 * Este script simula las llamadas del frontend al backend
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001'; // Ajusta según tu configuración

async function testWhatsAppSend() {
  console.log('🧪 Iniciando prueba de envío de WhatsApp...\n');

  try {
    // 1. Primero hacer login para obtener token
    console.log('1️⃣ Haciendo login...');
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
      const errorText = await loginResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login exitoso');
    console.log('📊 Respuesta de login:', JSON.stringify(loginData, null, 2));

    // Extraer token
    const token = loginData.data?.session?.access_token;
    if (!token) {
      console.error('❌ No se encontró token en la respuesta de login');
      return;
    }

    console.log('🔐 Token obtenido:', token.substring(0, 20) + '...\n');

    // 2. Probar envío de mensaje
    console.log('2️⃣ Enviando mensaje de prueba...');
    const messageData = {
      to: '525512345678', // Número de prueba
      message: 'Mensaje de prueba desde script - ' + new Date().toISOString(),
      clientId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('📤 Datos del mensaje:', messageData);

    const sendResponse = await fetch(`${BACKEND_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(messageData)
    });

    console.log('📊 Status de respuesta:', sendResponse.status);
    console.log('📊 Headers de respuesta:', Object.fromEntries(sendResponse.headers.entries()));

    if (!sendResponse.ok) {
      console.error('❌ Error enviando mensaje:', sendResponse.status, sendResponse.statusText);
      const errorText = await sendResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const sendData = await sendResponse.json();
    console.log('✅ Mensaje enviado exitosamente');
    console.log('📊 Respuesta del backend:', JSON.stringify(sendData, null, 2));

    // 3. Verificar si el mensaje se guardó en la base de datos
    console.log('\n3️⃣ Verificando mensajes en la base de datos...');
    const messagesResponse = await fetch(`${BACKEND_URL}/api/dashboard/conversations/public`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (messagesResponse.ok) {
      const messagesData = await messagesResponse.json();
      console.log('📊 Mensajes en BD:', JSON.stringify(messagesData, null, 2));
    } else {
      console.error('❌ Error obteniendo mensajes:', messagesResponse.status);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testWhatsAppSend(); 