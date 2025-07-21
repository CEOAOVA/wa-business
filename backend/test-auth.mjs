/**
 * Script de prueba para verificar la autenticación
 * Ejecutar: node test-auth.js
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3002';

async function testAuth() {
  console.log('🧪 Probando sistema de autenticación...\n');

  // Test 1: Login con admin
  console.log('1️⃣ Probando login con admin...');
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin2024!'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ Login exitoso');
      console.log('   Usuario:', loginData.data.user.full_name);
      console.log('   Rol:', loginData.data.user.role);
      console.log('   Token:', loginData.data.session?.access_token ? '✅' : '❌');
      
      const token = loginData.data.session?.access_token;
      
      // Test 2: Obtener perfil
      console.log('\n2️⃣ Probando obtener perfil...');
      const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const profileData = await profileResponse.json();
      
      if (profileResponse.ok) {
        console.log('✅ Perfil obtenido exitosamente');
        console.log('   Usuario:', profileData.data.full_name);
        console.log('   Email:', profileData.data.email);
        console.log('   Rol:', profileData.data.role);
      } else {
        console.log('❌ Error obteniendo perfil:', profileData.message);
      }

      // Test 3: Obtener lista de usuarios (solo admin)
      console.log('\n3️⃣ Probando obtener lista de usuarios...');
      const usersResponse = await fetch(`${API_BASE_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const usersData = await usersResponse.json();
      
      if (usersResponse.ok) {
        console.log('✅ Lista de usuarios obtenida exitosamente');
        console.log('   Total usuarios:', usersData.data.length);
        usersData.data.forEach(user => {
          console.log(`   - ${user.full_name} (${user.role}) - ${user.is_active ? 'Activo' : 'Inactivo'}`);
        });
      } else {
        console.log('❌ Error obteniendo usuarios:', usersData.message);
      }

      // Test 4: Logout
      console.log('\n4️⃣ Probando logout...');
      const logoutResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (logoutResponse.ok) {
        console.log('✅ Logout exitoso');
      } else {
        console.log('❌ Error en logout');
      }

    } else {
      console.log('❌ Error en login:', loginData.message);
    }

  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }

  // Test 5: Login con agente
  console.log('\n5️⃣ Probando login con agente...');
  try {
    const agentLoginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'agente1',
        password: 'Agente2024!'
      })
    });

    const agentLoginData = await agentLoginResponse.json();
    
    if (agentLoginResponse.ok) {
      console.log('✅ Login de agente exitoso');
      console.log('   Usuario:', agentLoginData.data.user.full_name);
      console.log('   Rol:', agentLoginData.data.user.role);
      
      const agentToken = agentLoginData.data.session?.access_token;
      
      // Test 6: Intentar acceder a lista de usuarios (debería fallar)
      console.log('\n6️⃣ Probando acceso a lista de usuarios con agente...');
      const agentUsersResponse = await fetch(`${API_BASE_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json',
        }
      });

      const agentUsersData = await agentUsersResponse.json();
      
      if (agentUsersResponse.ok) {
        console.log('⚠️  Agente pudo acceder a lista de usuarios (no debería)');
      } else {
        console.log('✅ Agente correctamente bloqueado de lista de usuarios');
        console.log('   Error:', agentUsersData.message);
      }

    } else {
      console.log('❌ Error en login de agente:', agentLoginData.message);
    }

  } catch (error) {
    console.log('❌ Error de conexión con agente:', error.message);
  }

  console.log('\n🎉 Pruebas completadas!');
}

// Ejecutar pruebas
testAuth().catch(console.error); 