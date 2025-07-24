// Script para probar el ordenamiento de conversaciones en el frontend
// Simula la lógica de ordenamiento del Sidebar

// Datos de prueba simulando conversaciones del backend
const testConversations = [
  {
    id: 'conv-1',
    contact_phone: '55123456789',
    last_message_at: '2025-07-23T18:24:57.898125+00:00',
    updated_at: '2025-07-23T18:24:57.898125+00:00',
    lastMessage: {
      id: 1,
      content: 'Hola, necesito información sobre repuestos',
      timestamp: '2025-07-23T18:24:57.898125+00:00',
      isFromUs: false
    },
    unreadCount: 0
  },
  {
    id: 'conv-2',
    contact_phone: '+1234567890-test',
    last_message_at: '2025-07-23T18:07:51.342363+00:00',
    updated_at: '2025-07-23T18:07:51.342363+00:00',
    lastMessage: {
      id: 2,
      content: 'Mensaje de prueba desde script de test',
      timestamp: '2025-07-23T18:07:51.342363+00:00',
      isFromUs: false
    },
    unreadCount: 2 // Este tiene mensajes no leídos
  },
  {
    id: 'conv-3',
    contact_phone: '525549679734',
    last_message_at: '2025-07-22T23:39:57.1+00:00',
    updated_at: '2025-07-22T23:39:57.1+00:00',
    lastMessage: {
      id: 3,
      content: 'hola',
      timestamp: '2025-07-22T23:39:57.1+00:00',
      isFromUs: false
    },
    unreadCount: 0
  },
  {
    id: 'conv-4',
    contact_phone: '5549679734',
    last_message_at: '2025-07-18T19:47:46.356+00:00',
    updated_at: '2025-07-18T19:47:46.356+00:00',
    lastMessage: {
      id: 4,
      content: 'hola',
      timestamp: '2025-07-18T19:47:46.356+00:00',
      isFromUs: false
    },
    unreadCount: 1 // Este también tiene mensajes no leídos
  }
];

// Función de ordenamiento ANTIGUA (que priorizaba no leídos)
function oldSorting(chats) {
  return chats.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

// Función de ordenamiento NUEVA (solo por último mensaje)
function newSorting(chats) {
  return chats.sort((a, b) => {
    // Usar el timestamp del último mensaje si existe, sino usar updatedAt
    const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.updated_at).getTime();
    const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.updated_at).getTime();
    return bTime - aTime; // Más reciente primero
  });
}

console.log('🧪 Probando ordenamiento de conversaciones en el frontend...\n');

console.log('📋 Conversaciones originales:');
testConversations.forEach((conv, index) => {
  console.log(`${index + 1}. ${conv.contact_phone} - ${conv.lastMessage.timestamp} (No leídos: ${conv.unreadCount})`);
});

console.log('\n🔴 Ordenamiento ANTIGUO (prioriza no leídos):');
const oldOrdered = oldSorting([...testConversations]);
oldOrdered.forEach((conv, index) => {
  console.log(`${index + 1}. ${conv.contact_phone} - ${conv.lastMessage.timestamp} (No leídos: ${conv.unreadCount})`);
});

console.log('\n🟢 Ordenamiento NUEVO (solo por último mensaje):');
const newOrdered = newSorting([...testConversations]);
newOrdered.forEach((conv, index) => {
  console.log(`${index + 1}. ${conv.contact_phone} - ${conv.lastMessage.timestamp} (No leídos: ${conv.unreadCount})`);
});

console.log('\n📊 Comparación:');
console.log('ANTIGUO: Los chats con mensajes no leídos aparecen primero, independientemente del timestamp');
console.log('NUEVO: Los chats se ordenan únicamente por el timestamp del último mensaje');

// Verificar que el nuevo ordenamiento es correcto
console.log('\n✅ Verificación del nuevo ordenamiento:');
let isCorrect = true;
for (let i = 0; i < newOrdered.length - 1; i++) {
  const current = newOrdered[i];
  const next = newOrdered[i + 1];
  
  const currentTime = new Date(current.lastMessage.timestamp).getTime();
  const nextTime = new Date(next.lastMessage.timestamp).getTime();
  
  if (currentTime < nextTime) {
    console.log(`❌ Orden incorrecto en posición ${i + 1}:`);
    console.log(`   Actual: ${current.lastMessage.timestamp} (${current.contact_phone})`);
    console.log(`   Siguiente: ${next.lastMessage.timestamp} (${next.contact_phone})`);
    isCorrect = false;
  }
}

if (isCorrect) {
  console.log('✅ El nuevo ordenamiento es correcto: más reciente arriba, más antiguo abajo');
} else {
  console.log('❌ El nuevo ordenamiento NO es correcto');
}

console.log('\n🎯 Resultado:');
console.log('El nuevo ordenamiento elimina la priorización de chats no leídos y ordena');
console.log('únicamente por el timestamp del último mensaje, como se solicitó.'); 