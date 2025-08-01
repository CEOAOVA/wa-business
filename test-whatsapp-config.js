/**
 * Script para verificar configuración de WhatsApp
 */

const BACKEND_URL = 'http://localhost:3001';

async function testWhatsAppConfig() {
  console.log('🔍 Verificando configuración de WhatsApp...\n');

  try {
    // 1. Verificar estado de WhatsApp
    console.log('1️⃣ Verificando estado de WhatsApp...');
    const statusResponse = await fetch(`${BACKEND_URL}/api/chat/status`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Estado de WhatsApp:', JSON.stringify(statusData, null, 2));
    } else {
      console.error('❌ Error obteniendo estado:', statusResponse.status);
    }

    // 2. Verificar información del número
    console.log('\n2️⃣ Verificando información del número...');
    const infoResponse = await fetch(`${BACKEND_URL}/api/chat/info`);
    
    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      console.log('📊 Información del número:', JSON.stringify(infoData, null, 2));
    } else {
      console.error('❌ Error obteniendo información:', infoResponse.status);
    }

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  }
}

testWhatsAppConfig(); 