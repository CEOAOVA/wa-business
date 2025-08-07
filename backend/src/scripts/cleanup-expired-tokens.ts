/**
 * Script para limpiar refresh tokens expirados
 * Se puede ejecutar como cron job o manualmente
 */

import { TokenService } from '../services/token.service';
import { logger } from '../utils/logger';

async function cleanupExpiredTokens() {
  try {
    console.log('🧹 Iniciando limpieza de tokens expirados...');
    
    const deletedCount = await TokenService.cleanupExpiredTokens();
    
    console.log(`✅ Limpieza completada. ${deletedCount} tokens expirados eliminados.`);
    
    // También revocar tokens de usuarios inactivos si es necesario
    // Esto es opcional y depende de las políticas de seguridad
    
    logger.info(`Token cleanup completed: ${deletedCount} tokens removed`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza de tokens:', error);
    logger.error('Token cleanup failed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  cleanupExpiredTokens()
    .then(() => {
      console.log('🎉 Script de limpieza finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script de limpieza falló:', error);
      process.exit(1);
    });
}

export { cleanupExpiredTokens };
