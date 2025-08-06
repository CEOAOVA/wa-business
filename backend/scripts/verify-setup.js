const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch(type) {
    case 'success':
      console.log(`${colors.green}✅ ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}❌ ${message}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
      break;
    case 'header':
      console.log(`\n${colors.bright}${colors.blue}${message}${colors.reset}`);
      break;
    default:
      console.log(message);
  }
}

async function verifySetup() {
  log('=== VERIFICACIÓN DE CONFIGURACIÓN DEL SISTEMA ===', 'header');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // 1. Verificar variables de entorno del Backend
  log('\n1️⃣  VARIABLES DE ENTORNO DEL BACKEND:', 'header');
  
  const requiredBackendVars = [
    { name: 'SUPABASE_URL', description: 'URL de Supabase' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service Role Key de Supabase' },
    { name: 'WHATSAPP_ACCESS_TOKEN', description: 'Token de acceso de WhatsApp' },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', description: 'ID del número de WhatsApp' },
    { name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', description: 'ID de la cuenta de WhatsApp Business' },
    { name: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', description: 'Token de verificación del webhook' }
  ];
  
  const optionalBackendVars = [
    { name: 'FRONTEND_URL', description: 'URL del frontend' },
    { name: 'JWT_SECRET', description: 'Secret para JWT' },
    { name: 'PORT', description: 'Puerto del servidor' }
  ];
  
  for (const varInfo of requiredBackendVars) {
    if (process.env[varInfo.name]) {
      const value = process.env[varInfo.name];
      const displayValue = varInfo.name.includes('KEY') || varInfo.name.includes('TOKEN') 
        ? `${value.substring(0, 10)}...` 
        : value;
      log(`${varInfo.name}: Configurado (${displayValue})`, 'success');
    } else {
      log(`${varInfo.name}: NO configurado - ${varInfo.description}`, 'error');
      hasErrors = true;
    }
  }
  
  for (const varInfo of optionalBackendVars) {
    if (process.env[varInfo.name]) {
      log(`${varInfo.name}: Configurado`, 'success');
    } else {
      log(`${varInfo.name}: No configurado (opcional) - ${varInfo.description}`, 'warning');
      hasWarnings = true;
    }
  }
  
  if (hasErrors) {
    log('\nFaltan variables de entorno críticas. Revisa tu archivo .env', 'error');
    process.exit(1);
  }
  
  // 2. Verificar conexión a Supabase
  log('\n2️⃣  CONEXIÓN A SUPABASE:', 'header');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  try {
    // Verificar que podemos conectar a Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (connectionError && connectionError.code !== 'PGRST116') { // PGRST116 = no rows (está bien)
      throw connectionError;
    }
    
    log('Conexión exitosa a Supabase', 'success');
    
    // Verificar tablas existentes
    const tables = ['messages', 'conversations', 'contacts', 'agents'];
    log('\nVerificando tablas:', 'info');
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          log(`  Tabla '${table}': NO EXISTE o sin acceso`, 'error');
          hasErrors = true;
        } else {
          log(`  Tabla '${table}': OK (${count || 0} registros)`, 'success');
        }
      } catch (err) {
        log(`  Tabla '${table}': ERROR - ${err.message}`, 'error');
        hasErrors = true;
      }
    }
    
  } catch (error) {
    log(`Error conectando a Supabase: ${error.message}`, 'error');
    log('Verifica que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY sean correctos', 'error');
    hasErrors = true;
  }
  
  // 3. Verificar Row Level Security (RLS)
  log('\n3️⃣  ROW LEVEL SECURITY (RLS):', 'header');
  
  try {
    // Intentar verificar si RLS está habilitado
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('check_rls_status', {});
    
    if (rlsError) {
      log('No se pudo verificar el estado de RLS (función RPC no disponible)', 'warning');
      log('Asegúrate de que RLS esté configurado correctamente en Supabase Dashboard', 'info');
      hasWarnings = true;
    } else {
      log('RLS verificado correctamente', 'success');
    }
  } catch (error) {
    log('Verificación de RLS no disponible - verificar manualmente en Supabase', 'warning');
    hasWarnings = true;
  }
  
  // 4. Verificar WhatsApp API
  log('\n4️⃣  WHATSAPP API:', 'header');
  
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const whatsappUrl = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
      const response = await axios.get(whatsappUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      });
      
      if (response.data) {
        log(`Número de WhatsApp verificado: ${response.data.display_phone_number || 'OK'}`, 'success');
        log(`Estado: ${response.data.verified_name || 'Verificado'}`, 'success');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        log('Token de WhatsApp inválido o expirado', 'error');
        hasErrors = true;
      } else if (error.response?.status === 404) {
        log('ID de número de WhatsApp no encontrado', 'error');
        hasErrors = true;
      } else {
        log(`Error verificando WhatsApp API: ${error.message}`, 'error');
        hasErrors = true;
      }
    }
  }
  
  // 5. Verificar configuración del Frontend
  log('\n5️⃣  CONFIGURACIÓN DEL FRONTEND:', 'header');
  
  const frontendEnvPath = '../frontend/.env';
  const fs = require('fs');
  const path = require('path');
  
  try {
    if (fs.existsSync(path.join(__dirname, frontendEnvPath))) {
      const frontendEnv = fs.readFileSync(path.join(__dirname, frontendEnvPath), 'utf8');
      
      const frontendVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'VITE_BACKEND_URL'
      ];
      
      for (const varName of frontendVars) {
        if (frontendEnv.includes(`${varName}=`)) {
          log(`${varName}: Configurado en frontend`, 'success');
        } else {
          log(`${varName}: NO configurado en frontend`, 'error');
          hasErrors = true;
        }
      }
    } else {
      log('Archivo .env del frontend no encontrado', 'warning');
      hasWarnings = true;
    }
  } catch (error) {
    log(`No se pudo verificar configuración del frontend: ${error.message}`, 'warning');
    hasWarnings = true;
  }
  
  // 6. Resumen final
  log('\n' + '='.repeat(50), 'header');
  log('RESUMEN DE VERIFICACIÓN:', 'header');
  
  if (hasErrors) {
    log('\n❌ Se encontraron errores críticos que deben ser resueltos', 'error');
    log('Por favor, revisa la configuración antes de continuar', 'error');
    process.exit(1);
  } else if (hasWarnings) {
    log('\n⚠️  Se encontraron advertencias no críticas', 'warning');
    log('El sistema puede funcionar pero revisa las advertencias', 'warning');
  } else {
    log('\n✅ Todas las verificaciones pasaron exitosamente', 'success');
    log('El sistema está listo para funcionar', 'success');
  }
  
  // 7. Recomendaciones
  log('\n📋 PRÓXIMOS PASOS RECOMENDADOS:', 'header');
  log('1. Ejecuta las migraciones de Supabase si no lo has hecho', 'info');
  log('2. Configura las políticas RLS en Supabase Dashboard', 'info');
  log('3. Verifica que el webhook de WhatsApp esté configurado', 'info');
  log('4. Prueba el envío de un mensaje de prueba', 'info');
  
  process.exit(hasErrors ? 1 : 0);
}

// Ejecutar verificación
verifySetup().catch(error => {
  log(`\nError inesperado durante la verificación: ${error.message}`, 'error');
  process.exit(1);
});