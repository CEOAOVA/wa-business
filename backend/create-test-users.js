/**
 * Script para crear usuarios de prueba directamente en Supabase
 */
const { createClient } = require('@supabase/supabase-js');
const { loadEnvWithUnicodeSupport } = require('./dist/config/env-loader');

// Cargar variables de entorno
loadEnvWithUnicodeSupport();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Configuración Supabase:');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Configurada ✅' : 'NO configurada ❌');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUsers() {
  console.log('\n🚀 Creando usuarios de prueba...\n');

  const testUsers = [
    {
      email: 'admin@aova.mx',
      password: 'Admin2024!',
      username: 'admin',
      full_name: 'Administrador del Sistema',
      role: 'admin'
    },
    {
      email: 'k.alvarado@aova.mx',
      password: 'Karla2024!',
      username: 'karla',
      full_name: 'Karla Alvarado',
      role: 'agent'
    },
    {
      email: 'moises.s@aova.mx',
      password: 'Moises2024!',
      username: 'moises',
      full_name: 'Moises S',
      role: 'agent'
    },
    {
      email: 'elisa.n@synaracare.com',
      password: 'Elisa2024!',
      username: 'elisa',
      full_name: 'Elisa N',
      role: 'agent'
    }
  ];

  for (const userData of testUsers) {
    try {
      console.log(`📝 Creando usuario: ${userData.email}`);

      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        console.log(`✅ Usuario ${userData.email} ya existe - saltando`);
        continue;
      }

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role
        },
        email_confirm: true
      });

      if (authError) {
        console.error(`❌ Error auth para ${userData.email}:`, authError.message);
        continue;
      }

      // Crear perfil de usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error(`❌ Error perfil para ${userData.email}:`, profileError.message);
        continue;
      }

      console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);

    } catch (error) {
      console.error(`💥 Error inesperado para ${userData.email}:`, error.message);
    }
  }

  // Verificar usuarios creados
  console.log('\n📋 Verificando usuarios en base de datos...');
  const { data: allUsers, error } = await supabase
    .from('user_profiles')
    .select('email, username, role, is_active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error obteniendo usuarios:', error.message);
    return;
  }

  console.log('\n👥 Usuarios disponibles:');
  allUsers.forEach(user => {
    console.log(`   📧 ${user.email} (${user.username}) - ${user.role} - ${user.is_active ? 'Activo' : 'Inactivo'}`);
  });

  console.log('\n🎉 ¡Usuarios de prueba listos!');
  console.log('\n🔑 Credenciales para login:');
  testUsers.forEach(user => {
    console.log(`   ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
}

createTestUsers()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }); 