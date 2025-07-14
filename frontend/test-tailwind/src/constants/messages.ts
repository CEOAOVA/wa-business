// Constantes de mensajes para la aplicación
export const MESSAGES = {
  // Mensajes de bienvenida y estado vacío
  WELCOME: {
    TITLE: "Bienvenido a Embler Chat",
    SUBTITLE: "Selecciona una conversación para comenzar a chatear",
    NO_MESSAGES: "No hay mensajes en esta conversación",
    SEND_FIRST: "Envía el primer mensaje para comenzar"
  },

  // WhatsApp
  WHATSAPP: {
    MODE_TITLE: "Modo WhatsApp",
    STATUS_CONNECTED: "Conectado",
    STATUS_DISCONNECTED: "Desconectado",
    INSTRUCTIONS: "Ingresa un número y envía mensajes directamente por WhatsApp",
    BUTTON_TEXT: "Usar WhatsApp",
    RECONNECT: "Reconectar"
  },

  // Búsqueda y navegación
  SEARCH: {
    PLACEHOLDER: "Buscar chats, clientes o mensajes...",
    NO_RESULTS: "No se encontraron chats",
    NO_CHATS: "No hay chats disponibles",
    CLEAR_SEARCH: "Limpiar búsqueda"
  },

  // Estadísticas
  STATS: {
    CHATS: "chats",
    UNREAD: "sin leer",
    ACTIVE: "activos",
    AVG_RESPONSE_TIME: "2.3 min",
    VERSION: "v2.0",
    TIME_LABEL: "Tiempo promedio"
  },

  // Estados del sistema
  SYSTEM: {
    PROCESSING: "Procesando...",
    READY: "Listo",
    CONNECTED: "Conectado",
    ERROR: "Error",
    RESET_CHAT: "🔄 Reset Chat",
    ONLINE: "En línea",
    MESSAGES_COUNT: "💬 Mensajes"
  },

  // Chat del cliente
  CLIENT_CHAT: {
    QUICK_RESPONSES_LABEL: "Respuestas rápidas:",
    FOOTER_TEXT: "Chatbot Real de Repuestos Automotrices • Powered by OpenRouter + Gemini 2.5 Flash Lite",
    QUICK_RESPONSES: [
      "Necesito un filtro de aceite",
      "Busco pastillas de freno",
      "¿Tienen repuestos para Toyota?",
      "Necesito cotización"
    ]
  },

  // Tiempo relativo
  TIME: {
    NOW: "Ahora",
    MINUTES_SHORT: "m",
    HOURS_SHORT: "h", 
    DAYS_SHORT: "d",
    NO_MESSAGES: "Sin mensajes"
  },

  // UI General
  UI: {
    BRAND_NAME: "EMBLER",
    CHAT_LABEL: "Chat",
    WHATSAPP_TEST: "WhatsApp Test",
    LOGOUT_CONFIRM: "¿Estás seguro de que quieres cerrar sesión?",
    CONNECTED_AS: "Conectado como",
    ADMIN_ROLE: "Administrador",
    AGENT_ROLE: "Agente"
  },

  // Estados de indicadores
  INDICATORS: {
    ASSIGNED: "Asignado",
    HIGH_PRIORITY: "Alta prioridad",
    WHATSAPP_ON: "WhatsApp ON",
    WHATSAPP_OFF: "WhatsApp OFF"
  },

  // Mensajes de testing (para eliminar en producción)
  TESTING: {
    DEBUG_NAME: "Debug Test",
    DEBUG_MESSAGE: "Mensaje de prueba para debugging",
    CLIENT_ONE: "Cliente Uno",
    CLIENT_TWO: "Cliente Dos",
    TEST_MESSAGE_1: "Primer mensaje de prueba",
    TEST_MESSAGE_2: "Segundo mensaje desde otro número", 
    TEST_MESSAGE_3: "Otro mensaje del primer cliente",
    SIMULATE_INCOMING: "Hola, este es un mensaje que YO (cliente) te envío a TI (agente).",
    SIMULATE_OUTGOING: "Hola, este es un mensaje que YO (agente) te envío a TI (cliente).",
    CLIENT_SIMULATED: "Cliente Simulado"
  }
}; 