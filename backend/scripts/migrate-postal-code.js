/**
 * Script para ejecutar la migración de código postal
 * Agrega el campo postal_code a la tabla contacts en Supabase
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de código postal...');
    console.log(`📡 Conectando a: ${API_BASE_URL}`);

    const response = await axios.post(`${API_BASE_URL}/api/contacts/migrate`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 segundos
    });

    if (response.data.success) {
      console.log('✅ Migración completada exitosamente');
      console.log('📋 Detalles:', response.data.message);
      console.log('📝 Campo postal_code agregado a la tabla contacts');
    } else {
      console.error('❌ Error en migración:', response.data.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:');
    if (error.response) {
      console.error('📡 Respuesta del servidor:', error.response.data);
      console.error('🔢 Status:', error.response.status);
    } else if (error.request) {
      console.error('🌐 Error de conexión:', error.message);
    } else {
      console.error('💻 Error:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar migración
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration }; 