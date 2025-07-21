/**
 * Script para inicializar usuarios del sistema
 * Ejecutar: node src/scripts/init-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(userData) {
  try {
    console.log(`📝 Creando usuario: ${userData.email}`);
    
    // Crear usuario en Supabase Auth usando el cliente administrativo
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: {
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role
      },
      email_confirm: true // Confirmar email automáticamente
    });

    if (authError) {
      console.error(`❌ Error creando auth user ${userData.email}:`, authError.message);
      return null;
    }

    if (!authData.user) {
      console.error(`❌ No se obtuvo data de usuario para ${userData.email}`);
      return null;
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
        whatsapp_id: userData.whatsapp_id,
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error(`❌ Error creando perfil para ${userData.email}:`, profileError.message);
      return null;
    }

    console.log(`✅ Usuario creado exitosamente: ${userData.email}`);
    return profileData;
  } catch (error) {
    console.error(`❌ Error inesperado creando usuario ${userData.email}:`, error.message);
    return null;
  }
}

async function initUsers() {
  console.log('🚀 Inicializando usuarios del sistema...\n');

  // Definir usuarios iniciales
  const initialUsers = [
    {
      username: 'agente2',
      full_name: 'Agente de Ventas 2',
      email: 'elisa.n@synaracare.com',
      password: 'Agente2024!',
      role: 'agent'
    }
  ];

  // Verificar si ya existen usuarios
  const { data: existingUsers, error: fetchError } = await supabase
    .from('user_profiles')
    .select('email, role');

  if (fetchError) {
    console.error('❌ Error verificando usuarios existentes:', fetchError.message);
    return;
  }

  if (existingUsers && existingUsers.length > 0) {
    console.log('📋 Usuarios existentes:');
    existingUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    console.log('\n⚠️  Ya existen usuarios en el sistema.');
    
    // Verificar si el usuario que queremos crear ya existe
    const targetUser = initialUsers[0]; // Solo tenemos agente2 en la lista
    const userExists = existingUsers.some(user => user.email === targetUser.email);
    
    if (userExists) {
      console.log(`✅ El usuario ${targetUser.username} ya existe.`);
      return;
    }
    
    console.log(`📝 Creando usuario adicional: ${targetUser.username}`);
  }

  console.log('👥 Creando usuarios iniciales...\n');

  const results = [];
  for (const userData of initialUsers) {
    const result = await createUser(userData);
    results.push({ userData, result });
    console.log(''); // Línea en blanco para separar
  }

  // Resumen
  console.log('📊 Resumen de creación de usuarios:');
  const successful = results.filter(r => r.result).length;
  const failed = results.filter(r => !r.result).length;
  
  console.log(`✅ Exitosos: ${successful}`);
  console.log(`❌ Fallidos: ${failed}`);

  if (successful > 0) {
    console.log('\n🎉 Sistema inicializado correctamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   (Para login usar USERNAME, no email)');
    results.forEach(({ userData, result }) => {
      if (result) {
        console.log(`   ${userData.role.toUpperCase()}: ${userData.username} / ${userData.password}`);
        console.log(`      Email: ${userData.email} (solo para registro)`);
      }
    });
    console.log('\n⚠️  IMPORTANTE: Cambia las contraseñas después del primer login!');
  } else {
    console.log('\n❌ No se pudo inicializar el sistema. Revisa los errores arriba.');
  }
}

// Ejecutar el script
initUsers().catch(console.error); 