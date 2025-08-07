const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAgents() {
  console.log('🔍 Verificando datos en tabla agents...');
  
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*');

    if (error) {
      console.error('❌ Error consultando agents:', error);
      return;
    }

    console.log('\n📊 DATOS EN TABLA AGENTS:');
    console.log('========================================');
    
    agents.forEach((agent, index) => {
      console.log(`\n${index + 1}. Agent ID: ${agent.id}`);
      console.log(`   Username: "${agent.username}"`);
      console.log(`   Password: "${agent.password}"`);
      console.log(`   Email: "${agent.email}"`);
      console.log(`   Full Name: "${agent.full_name}"`);
      console.log(`   Role: "${agent.role}"`);
      console.log(`   Active: ${agent.is_active}`);
      console.log('   ----------------------------------------');
    });

    console.log('\n🔍 PROBANDO LOGIN CON k.alvarado@aova.mx...');
    
    // Probar búsqueda exacta
    const { data: testAgent, error: testError } = await supabase
      .from('agents')
      .select('*')
      .eq('username', 'k.alvarado@aova.mx')
      .single();

    if (testError) {
      console.log('❌ No se encontró agent con username "k.alvarado@aova.mx"');
      console.log('Error:', testError.message);
    } else {
      console.log('✅ Agent encontrado:');
      console.log(`   Username: "${testAgent.username}"`);
      console.log(`   Password: "${testAgent.password}"`);
      console.log('   ¿Coincide con "Agente2024!"?', testAgent.password === 'Agente2024!');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugAgents();