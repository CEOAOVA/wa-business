/**
 * Configuración centralizada para WhatsApp Backend con LLM
 * Migrado desde Backend-Embler y adaptado para WhatsApp Business
 */

/**
 * Interfaz de configuración de la aplicación
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  
  // WhatsApp Configuration (existente)
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    apiVersion: string;
    baseUrl: string;
    webhook: {
      verifyToken: string;
      path: string;
      url?: string;
    };
  };
  
  // LLM Configuration (nuevo)
  llm: {
    openRouterApiKey: string;
    openRouterBaseUrl: string;
    openRouterModel: string;
    defaultTemperature: number;
    defaultMaxTokens: number;
    timeout: number;
  };
  
  // SOAP Services Configuration (nuevo)
  soap: {
    wsdlUrl: string;
    endpointUrl: string;
    tokenCacheDuration: number;
    inventoryCacheTtl: number;
    connectionRetries: number;
  };
  
  // Legacy properties for backward compatibility
  soapWsdlUrl?: string;
  soapEndpoint?: string;
  tokenCacheDuration?: number;
  inventoryCacheTtl?: number;
  posCredentials?: Record<string, { user: string; pwd: string }>;
  apiNinjasKey?: string;
  
  // POS Configuration (nuevo)
  pos: {
    defaultPosId: string;
    validPosIds: string[];
    credentials: Record<string, { user: string; pwd: string }>;
  };
  
  // External APIs (nuevo)
  externalApis: {
    apiNinjasKey?: string;
  };
  
  // Database Configuration (Supabase)
  database: {
    url: string;
    supabaseUrl: string;
    supabaseKey: string;
    enablePooling: boolean;
    maxConnections: number;
  };
  
  // System Configuration
  system: {
    logLevel: string;
    enableDetailedLogs: boolean;
  };
}

/**
 * Obtiene una variable de entorno con valor por defecto
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Variable de entorno requerida no encontrada: ${key}`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Parsea las credenciales POS desde variable de entorno JSON
 */
function parsePosCredentials(): Record<string, { user: string; pwd: string }> {
  try {
    const credentialsStr = getEnv('POS_CREDENTIALS', '{}');
    const credentials = JSON.parse(credentialsStr);
    
    // Validar estructura
    for (const [posId, creds] of Object.entries(credentials)) {
      if (!creds || typeof creds !== 'object') {
        throw new Error(`Credenciales inválidas para POS ${posId}`);
      }
      const { user, pwd } = creds as any;
      if (!user || !pwd) {
        throw new Error(`Credenciales incompletas para POS ${posId}`);
      }
    }
    
    return credentials;
  } catch (error) {
    console.warn(`Error parseando POS_CREDENTIALS: ${error}. Usando credenciales por defecto.`);
    return {
      ME: { user: 'test', pwd: 'test' },
      SAT: { user: 'test', pwd: 'test' }
    };
  }
}

/**
 * Obtiene la configuración completa de la aplicación
 */
export function getConfig(): AppConfig {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return {
    port: parseInt(getEnv('PORT', '3002'), 10),
    nodeEnv: getEnv('NODE_ENV', 'development'),
    
    // WhatsApp Configuration
    whatsapp: {
      accessToken: getEnv('WHATSAPP_ACCESS_TOKEN'),
      phoneNumberId: getEnv('WHATSAPP_PHONE_NUMBER_ID'),
      apiVersion: getEnv('WHATSAPP_API_VERSION', 'v22.0'),
      baseUrl: getEnv('WHATSAPP_BASE_URL', 'https://graph.facebook.com'),
      webhook: {
        verifyToken: getEnv('WEBHOOK_VERIFY_TOKEN'),
        path: getEnv('WEBHOOK_PATH', '/api/chat/webhook'),
        url: getEnv('WEBHOOK_URL'),
      },
    },
    
    // LLM Configuration
    llm: {
      openRouterApiKey: getEnv('OPEN_ROUTER_API_KEY'),
      openRouterBaseUrl: getEnv('OPEN_ROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      openRouterModel: getEnv('OPEN_ROUTER_DEFAULT_MODEL', 'google/gemini-flash-1.5'),
      defaultTemperature: parseFloat(getEnv('DEFAULT_TEMPERATURE', '0.7')),
      defaultMaxTokens: parseInt(getEnv('DEFAULT_MAX_TOKENS', '1000'), 10),
      timeout: parseInt(getEnv('LLM_TIMEOUT_MS', '60000'), 10),
    },
    
    // SOAP Services Configuration
    soap: {
      wsdlUrl: getEnv('EMBLER_WSDL_URL'),
      endpointUrl: getEnv('EMBLER_ENDPOINT_URL'),
      tokenCacheDuration: parseInt(getEnv('TOKEN_CACHE_DURATION', '10'), 10),
      inventoryCacheTtl: parseInt(getEnv('INVENTORY_CACHE_TTL', '300000'), 10),
      connectionRetries: parseInt(getEnv('SOAP_CONNECTION_RETRIES', '3'), 10),
    },
    
    // POS Configuration
    pos: {
      defaultPosId: getEnv('DEFAULT_POS_ID', 'SAT'),
      validPosIds: getEnv('VALID_POS_IDS', 'ME,CUA,ECA,IZT,LIND,PORT,QRO,SAT,TPN,VC').split(','),
      credentials: parsePosCredentials(),
    },
    
    // External APIs
    externalApis: {
      apiNinjasKey: getEnv('API_NINJAS_KEY', ''),
    },
    
    // Database Configuration (Supabase)
    database: {
      url: getEnv('DATABASE_URL', 'file:./dev.db'),
      supabaseUrl: getEnv('SUPABASE_URL'),
      supabaseKey: getEnv('SUPABASE_ANON_KEY'),
      enablePooling: getEnv('SUPABASE_POOLING', 'true') === 'true',
      maxConnections: parseInt(getEnv('SUPABASE_MAX_CONNECTIONS', '10'), 10),
    },
    
    // System Configuration
    system: {
      logLevel: getEnv('LOG_LEVEL', isDev ? 'debug' : 'info'),
      enableDetailedLogs: getEnv('ENABLE_DETAILED_LOGS', 'false').toLowerCase() === 'true',
    },
    
    // Legacy properties for backward compatibility
    soapWsdlUrl: getEnv('EMBLER_WSDL_URL'),
    soapEndpoint: getEnv('EMBLER_ENDPOINT_URL'),
    tokenCacheDuration: parseInt(getEnv('TOKEN_CACHE_DURATION', '10'), 10),
    inventoryCacheTtl: parseInt(getEnv('INVENTORY_CACHE_TTL', '300000'), 10),
    posCredentials: parsePosCredentials(),
    apiNinjasKey: getEnv('API_NINJAS_KEY', ''),
  };
}

/**
 * Valida que las variables críticas existan en producción
 */
export function validateCriticalConfig(): void {
  const config = getConfig();
  const missing: string[] = [];
  
  if (config.nodeEnv === 'production') {
    // LLM crítico
    if (!config.llm.openRouterApiKey) {
      missing.push('OPEN_ROUTER_API_KEY');
    }
    
    // WhatsApp crítico
    if (!config.whatsapp.accessToken) {
      missing.push('WHATSAPP_ACCESS_TOKEN');
    }
    if (!config.whatsapp.phoneNumberId) {
      missing.push('WHATSAPP_PHONE_NUMBER_ID');
    }
    if (!config.whatsapp.webhook.verifyToken) {
      missing.push('WEBHOOK_VERIFY_TOKEN');
    }
    
    // SOAP crítico
    if (!config.soap.wsdlUrl) {
      missing.push('EMBLER_WSDL_URL');
    }
    if (!config.soap.endpointUrl) {
      missing.push('EMBLER_ENDPOINT_URL');
    }
    
    // Supabase crítico
    if (!config.database.supabaseUrl) {
      missing.push('SUPABASE_URL');
    }
    if (!config.database.supabaseKey) {
      missing.push('SUPABASE_ANON_KEY');
    }
    
    // Verificar credenciales POS
    for (const posId of config.pos.validPosIds) {
      if (!config.pos.credentials[posId]) {
        missing.push(`POS_CREDENTIALS para "${posId}"`);
      }
    }
  }
  
  if (missing.length) {
    const msg = `❌ Variables críticas faltantes: ${missing.join(', ')}`;
    console.error(msg);
    
    if (config.nodeEnv === 'production') {
      console.error('🚨 ADVERTENCIA: El servicio arrancará pero algunas funciones no estarán disponibles');
      console.error('📋 Configurar estas variables para funcionalidad completa:', missing.join(', '));
    }
  } else {
    console.log('✅ Configuración validada correctamente');
  }
}

/**
 * Logging de configuración (sin exponer secretos)
 */
export function logConfigSummary(): void {
  const config = getConfig();
  
  console.log('📋 Resumen de Configuración:');
  console.log(`   🌍 Entorno: ${config.nodeEnv}`);
  console.log(`   🚀 Puerto: ${config.port}`);
  console.log(`   🤖 Modelo LLM: ${config.llm.openRouterModel}`);
  console.log(`   📱 WhatsApp Phone ID: ${config.whatsapp.phoneNumberId}`);
  console.log(`   🏪 POS por defecto: ${config.pos.defaultPosId}`);
  console.log(`   🏭 POS válidos: ${config.pos.validPosIds.join(', ')}`);
  console.log(`   🔧 SOAP WSDL configurado: ${config.soap.wsdlUrl ? 'Sí' : 'No'}`);
  console.log(`   🔑 API Keys configuradas:`);
  console.log(`      - OpenRouter: ${config.llm.openRouterApiKey ? '✅' : '❌'}`);
  console.log(`      - WhatsApp: ${config.whatsapp.accessToken ? '✅' : '❌'}`);
  console.log(`      - API Ninjas: ${config.externalApis.apiNinjasKey ? '✅' : '❌'}`);
} 