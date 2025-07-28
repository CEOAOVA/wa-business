const fetch = require('node-fetch');

async function testSendMessage() {
  const testData = {
    to: '5549679734', // Número de prueba
    message: 'Mensaje de prueba desde script'
  };

  console.log('🧪 Probando envío de mensaje con datos:', testData);

  try {
    const response = await fetch('http://localhost:3002/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📊 Response:', data);
    
    if (!response.ok) {
      console.error('❌ Error en la petición');
    } else {
      console.log('✅ Petición exitosa');
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

// Ejecutar la prueba
testSendMessage(); 