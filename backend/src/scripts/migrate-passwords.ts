/**
 * Script de migración para convertir contraseñas en texto plano a hashes bcrypt
 * Ejecutar con: npm run migrate:passwords
 */

import { supabaseAdmin } from '../config/supabase';
import { PasswordUtils } from '../utils/password.utils';
import { logger } from '../utils/logger';

async function migratePasswords() {
  try {
    console.log('🔐 Iniciando migración de contraseñas...');
    
    // Verificar que supabaseAdmin esté disponible
    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client no está disponible. Verifica las variables de entorno.');
    }
    
    // Obtener todos los agentes
    const { data: agents, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('id, username, password')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Error obteniendo agentes: ${fetchError.message}`);
    }

    if (!agents || agents.length === 0) {
      console.log('✅ No hay agentes para migrar');
      return;
    }

    console.log(`📊 Encontrados ${agents.length} agentes para verificar`);

    let migratedCount = 0;
    let alreadyHashedCount = 0;
    let errorCount = 0;

    // Procesar cada agente
    for (const agent of agents) {
      try {
        // Verificar si la contraseña ya está hasheada
        if (PasswordUtils.isPasswordHashed(agent.password)) {
          alreadyHashedCount++;
          console.log(`✓ ${agent.username} - contraseña ya hasheada`);
          continue;
        }

        // Hashear la contraseña
        console.log(`🔄 Migrando contraseña para: ${agent.username}`);
        const hashedPassword = await PasswordUtils.hashPassword(agent.password);

        // Actualizar en la base de datos
        const { error: updateError } = await supabaseAdmin!
          .from('agents')
          .update({ 
            password: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id);

        if (updateError) {
          throw new Error(`Error actualizando agente ${agent.username}: ${updateError.message}`);
        }

        migratedCount++;
        console.log(`✅ ${agent.username} - contraseña migrada exitosamente`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrando ${agent.username}:`, error);
        logger.error(`Error migrando contraseña para ${agent.username}:`, error);
      }
    }

    // Resumen final
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`✅ Contraseñas migradas: ${migratedCount}`);
    console.log(`ℹ️  Ya hasheadas: ${alreadyHashedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${agents.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Hubo errores durante la migración. Revisa los logs para más detalles.');
    } else {
      console.log('\n✅ Migración completada exitosamente!');
    }

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    logger.error('Error fatal en migración de contraseñas:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migratePasswords()
  .then(() => {
    console.log('\n🎉 Proceso de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migración falló:', error);
    process.exit(1);
  });
