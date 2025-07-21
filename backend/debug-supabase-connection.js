console.log('🔍 Diagnóstico detallado de conexión Supabase...\n');

// Verificar variables de entorno
console.log('📊 Variables de entorno:');
console.log('NODE_VERSION:', process.version);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NO CONFIGURADA');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA');

// Test 1: Verificar URL válida
console.log('\n🔗 Test 1: Verificando URL...');
const url = process.env.SUPABASE_URL;
if (!url) {
  console.log('❌ SUPABASE_URL no está configurada');
  process.exit(1);
}

try {
  const urlObj = new URL(url);
  console.log('✅ URL válida:', urlObj.hostname);
} catch (error) {
  console.log('❌ URL inválida:', error.message);
  process.exit(1);
}

// Test 2: Verificar clave
console.log('\n🔑 Test 2: Verificando clave...');
const key = process.env.SUPABASE_ANON_KEY;
if (!key) {
  console.log('❌ SUPABASE_ANON_KEY no está configurada');
  process.exit(1);
}

console.log('✅ Clave configurada, longitud:', key.length);

// Test 3: Fetch directo (sin Supabase client)
console.log('\n🌐 Test 3: Fetch directo a REST API...');
try {
  const response = await fetch(`${url}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Fetch directo exitoso');
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers));
  
  if (response.ok) {
    console.log('✅ API respondió correctamente');
  } else {
    const text = await response.text();
    console.log('⚠️ API respondió con error:', text);
  }
} catch (error) {
  console.log('❌ Error en fetch directo:', error.message);
  console.log('Causa:', error.cause);
  console.log('Stack:', error.stack);
}

// Test 4: Probar con cliente Supabase
console.log('\n📚 Test 4: Cliente Supabase...');
try {
  const { createClient } = await import('@supabase/supabase-js');
  
  console.log('✅ Librería Supabase importada correctamente');
  
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
  
  console.log('✅ Cliente Supabase creado');
  
  // Prueba simple
  const { data, error } = await supabase
    .from('user_profiles')
    .select('count', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Error en consulta Supabase:', error.message);
    console.log('Detalles:', error.details);
    console.log('Hint:', error.hint);
    console.log('Code:', error.code);
  } else {
    console.log('✅ Consulta Supabase exitosa');
    console.log('Resultado:', data);
  }
} catch (error) {
  console.log('❌ Error con cliente Supabase:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n🏁 Diagnóstico completado'); 