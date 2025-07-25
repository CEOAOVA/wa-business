#!/usr/bin/env node

/**
 * Script de diagnóstico de Supabase para WhatsApp Business Platform
 * Verifica la configuración de Supabase y conectividad
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnóstico de Supabase...\n');

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, 'env.local');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📁 Usando archivo: .env');
} else if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  console.log('📁 Usando archivo: env.local');
} else {
  console.log('❌ No se encontró archivo .env o env.local');
  console.log('💡 Verificando variables de entorno del sistema...');
}

// Variables de Supabase críticas
const supabaseVars = {
  'SUPABASE_URL': 'https://',
  'SUPABASE_ANON_KEY': 'eyJ',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJ'
};

console.log('\n📋 Variables de Supabase:\n');

let allGood = true;
const foundVars = {};

for (const [varName, expectedValue] of Object.entries(supabaseVars)) {
  // Buscar en archivo .env
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match) {
    const value = match[1].trim();
    if (value.includes(expectedValue)) {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
      foundVars[varName] = value;
    } else {
      console.log(`⚠️  ${varName}: ${value} (formato inesperado)`);
      allGood = false;
    }
  } else {
    // Verificar en variables de entorno del sistema
    const envValue = process.env[varName];
    if (envValue) {
      console.log(`✅ ${varName}: ${envValue.substring(0, 20)}... (del sistema)`);
      foundVars[varName] = envValue;
    } else {
      console.log(`❌ ${varName}: NO CONFIGURADA`);
      allGood = false;
    }
  }
}

console.log('\n🔧 Verificando configuración de Supabase...\n');

// Verificar archivo de configuración
const supabaseConfigPath = path.join(__dirname, 'src', 'config', 'supabase.ts');
if (fs.existsSync(supabaseConfigPath)) {
  const configContent = fs.readFileSync(supabaseConfigPath, 'utf8');
  
  if (configContent.includes('createClient')) {
    console.log('✅ Archivo de configuración de Supabase encontrado');
  } else {
    console.log('❌ Archivo de configuración de Supabase no válido');
    allGood = false;
  }
} else {
  console.log('❌ Archivo de configuración de Supabase no encontrado');
  allGood = false;
}

// Verificar archivo compilado
const distSupabasePath = path.join(__dirname, 'dist', 'config', 'supabase.js');
if (fs.existsSync(distSupabasePath)) {
  console.log('✅ Archivo compilado de Supabase encontrado');
} else {
  console.log('⚠️  Archivo compilado de Supabase no encontrado (ejecutar npm run build)');
}

console.log('\n🌐 Verificando conectividad...\n');

// Intentar crear cliente de Supabase si tenemos las variables
if (foundVars.SUPABASE_URL && foundVars.SUPABASE_ANON_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(foundVars.SUPABASE_URL, foundVars.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    
    console.log('✅ Cliente de Supabase creado exitosamente');
    
    // Verificar conectividad básica
    console.log('🔍 Probando conectividad...');
    supabase.from('agents').select('count').limit(1)
      .then(() => {
        console.log('✅ Conexión a Supabase exitosa');
      })
      .catch((error) => {
        console.log('❌ Error de conexión a Supabase:', error.message);
        allGood = false;
      });
      
  } catch (error) {
    console.log('❌ Error creando cliente de Supabase:', error.message);
    allGood = false;
  }
} else {
  console.log('⚠️  No se pueden probar las variables de Supabase');
}

console.log('\n📊 Resumen de diagnóstico:');
if (allGood) {
  console.log('✅ Configuración de Supabase correcta');
  console.log('\n🚀 Próximos pasos:');
  console.log('1. Verificar que las variables estén en Coolify');
  console.log('2. Redeployar el backend');
  console.log('3. Probar login nuevamente');
} else {
  console.log('❌ Hay problemas con la configuración de Supabase');
  console.log('\n🔧 Soluciones:');
  console.log('1. Verificar variables de entorno en Coolify:');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('2. Asegurar que las URLs y keys sean correctas');
  console.log('3. Verificar que el proyecto de Supabase esté activo');
  console.log('4. Redeployar después de configurar las variables');
}

console.log('\n📝 Variables requeridas en Coolify:');
console.log('SUPABASE_URL=https://tu-proyecto.supabase.co');
console.log('SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'); 