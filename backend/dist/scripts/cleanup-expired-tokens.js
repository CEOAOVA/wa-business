"use strict";
/**
 * Script para limpiar refresh tokens expirados
 * Se puede ejecutar como cron job o manualmente
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = cleanupExpiredTokens;
const token_service_1 = require("../services/token.service");
const logger_1 = require("../utils/logger");
function cleanupExpiredTokens() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🧹 Iniciando limpieza de tokens expirados...');
            const deletedCount = yield token_service_1.TokenService.cleanupExpiredTokens();
            console.log(`✅ Limpieza completada. ${deletedCount} tokens expirados eliminados.`);
            // También revocar tokens de usuarios inactivos si es necesario
            // Esto es opcional y depende de las políticas de seguridad
            logger_1.logger.info(`Token cleanup completed: ${deletedCount} tokens removed`);
        }
        catch (error) {
            console.error('❌ Error durante la limpieza de tokens:', error);
            logger_1.logger.error('Token cleanup failed:', error);
            process.exit(1);
        }
    });
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
