/**
 * Script para probar la autenticación con email
 * Ejecutar: node src/scripts/test-email-auth.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testEmailLogin(email, password) {
  try {
    console.log(`\n🔐 Probando login con email: ${email}`);
    
    // Buscar usuario por email usando el cliente administrativo
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profileError || !profileData) {
      console.error('❌ Usuario no encontrado:', profileError?.message || 'No existe');
      return false;
    }
    
    console.log(`✅ Usuario encontrado: ${profileData.username}`);
    console.log(`   Rol: ${profileData.role}`);
    console.log(`   Activo: ${profileData.is_active ? 'Sí' : 'No'}`);
    
    if (!profileData.is_active) {
      console.error('❌ Usuario inactivo');
      return false;
    }
    
    // Intentar autenticación con el cliente anónimo (como lo haría el frontend)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      console.error('❌ Error de autenticación:', error.message);
      return false;
    }
    
    if (!data.user) {
      console.error('❌ No se obtuvo información del usuario');
      return false;
    }
    
    console.log('✅ Autenticación exitosa');
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Session: ${data.session ? 'Creada' : 'No creada'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Probando autenticación con email...\n');
  
  const users = [
    { email: 'moises.s@aova.mx', password: 'Admin2024!' },
    { email: 'k.alvarado@aova.mx', password: 'Agente2024!' },
    { email: 'elisa.n@synaracare.com', password: 'Agente2024!' }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of users) {
    const success = await testEmailLogin(user.email, user.password);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n📊 Resumen de pruebas:');
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Fallidos: ${failCount}`);
  
  if (successCount === users.length) {
    console.log('\n🎉 ¡Todos los usuarios pueden autenticarse con email correctamente!');
  } else {
    console.log('\n⚠️  Algunos usuarios tienen problemas de autenticación');
  }
}

main().catch(console.error); 