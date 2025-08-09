/*
  Debug: Verificar credenciales que el backend espera para un usuario de la tabla agents
  Uso:
    node scripts/debug-auth-credentials.js --username "correo@dominio.com" --password "TuPassword"

  Requisitos:
    - Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE o SUPABASE_SERVICE_ROLE_KEY
*/

/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Intentar cargar bcrypt nativo; si falla, usar bcryptjs
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (_) {
  try {
    bcrypt = require('bcryptjs');
    console.warn('ℹ️ Usando bcryptjs como fallback');
  } catch (e) {
    console.error('❌ No se pudo cargar bcrypt ni bcryptjs. Instala al menos uno.');
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const next = args[i + 1];
    if (key === '--username' || key === '-u') {
      result.username = next;
      i += 1;
    } else if (key === '--password' || key === '-p') {
      result.password = next;
      i += 1;
    } else if (key === '--raw-output') {
      result.raw = true;
    }
  }
  return result;
}

async function main() {
  const { username, password, raw } = parseArgs();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE(_KEY)');
    process.exit(1);
  }

  if (!username) {
    console.error('❌ Falta el parámetro --username');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log('🔍 Buscando usuario en tabla agents...');
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !agent) {
    console.error('❌ Usuario no encontrado por username. Buscando similares...');
    const { data: likeAgents } = await supabase
      .from('agents')
      .select('id, username, email, is_active, role')
      .ilike('username', `%${username}%`)
      .limit(10);
    console.table(likeAgents || []);
    process.exit(2);
  }

  const isHashed = /^\$2[aby]\$\d{2}\$/.test(agent.password || '');

  const summary = {
    id: agent.id,
    username: agent.username,
    email: agent.email,
    role: agent.role,
    is_active: agent.is_active,
    password_is_hashed: isHashed,
    password_preview: isHashed ? `${(agent.password || '').slice(0, 12)}...` : (raw ? agent.password : '(oculto)')
  };

  console.log('\n📋 Perfil encontrado:');
  console.table([summary]);

  if (password) {
    console.log('\n🔐 Verificando contraseña proporcionada...');
    let match = false;
    if (isHashed) {
      try {
        match = await bcrypt.compare(password, agent.password);
      } catch (e) {
        console.error('❌ Error comparando hash:', e.message);
      }
    } else {
      match = password === agent.password;
    }
    console.log(`Resultado de verificación: ${match ? '✅ COINCIDE' : '❌ NO COINCIDE'}`);
  } else {
    console.log('\nℹ️ Sugerencia: pase --password "TuPassword" para validar coincidencia.');
  }

  // Revisar espacios y normalización
  const trimmedEqual = agent.username?.trim() === username.trim();
  if (!trimmedEqual) {
    console.warn('\n⚠️ Posible problema de espacios:');
    console.warn(` - username en DB: "${agent.username}"`);
    console.warn(` - username enviado: "${username}"`);
  }

  // Mostrar fecha de última actualización si existe
  if (agent.updated_at || agent.created_at) {
    console.log('\n🕒 Timestamps:');
    console.log(` - created_at: ${agent.created_at}`);
    console.log(` - updated_at: ${agent.updated_at}`);
  }
}

main().catch((e) => {
  console.error('❌ Error inesperado:', e);
  process.exit(1);
});


