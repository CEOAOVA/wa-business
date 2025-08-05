"use strict";
/**
 * Health Check Routes - Monitoreo del estado de servicios
 * Permite verificar el estado de todos los componentes críticos
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const whatsapp_service_1 = require("../services/whatsapp.service");
const structured_logger_1 = require("../utils/structured-logger");
const unified_database_service_1 = require("../services/unified-database.service");
const router = express_1.default.Router();
/**
 * Health check general del sistema
 */
router.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    const correlationId = req.correlationId || `health_${Date.now()}`;
    structured_logger_1.StructuredLogger.logSystemEvent('health_check_start', { correlationId });
    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            correlationId,
            services: {
                database: yield checkDatabase(correlationId),
                whatsapp: yield checkWhatsAppAPI(correlationId),
                supabase: yield checkSupabase(correlationId),
                memory: checkMemoryUsage(),
                uptime: process.uptime()
            },
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };
        // Determinar estado general
        const serviceStatuses = Object.values(health.services).map(s => typeof s === 'object' && s !== null ? s.status : 'ok');
        const allHealthy = serviceStatuses.every(status => status === 'ok');
        health.status = allHealthy ? 'ok' : 'degraded';
        const duration = Date.now() - startTime;
        structured_logger_1.StructuredLogger.logPerformanceMetric('health_check_complete', duration, {
            status: health.status,
            servicesChecked: Object.keys(health.services).length
        }, correlationId);
        res.status(allHealthy ? 200 : 503).json(health);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorId = structured_logger_1.StructuredLogger.logError('health_check', error, { duration }, correlationId);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            correlationId,
            errorId,
            message: 'Health check failed'
        });
    }
}));
/**
 * Health check detallado con métricas
 */
router.get('/health/detailed', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    const correlationId = req.correlationId || `detailed_health_${Date.now()}`;
    try {
        const detailedHealth = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            correlationId,
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                nodeVersion: process.version,
                pid: process.pid
            },
            services: {
                database: yield checkDatabaseDetailed(correlationId),
                whatsapp: yield checkWhatsAppDetailed(correlationId),
                supabase: yield checkSupabaseDetailed(correlationId)
            },
            metrics: {
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }
        };
        // Determinar estado general
        const serviceStatuses = Object.values(detailedHealth.services).map(s => s.status);
        const allHealthy = serviceStatuses.every(status => status === 'ok');
        detailedHealth.status = allHealthy ? 'ok' : 'degraded';
        detailedHealth.metrics.responseTime = Date.now() - startTime;
        structured_logger_1.StructuredLogger.logSystemEvent('detailed_health_check_complete', {
            correlationId,
            status: detailedHealth.status,
            responseTime: detailedHealth.metrics.responseTime
        });
        res.status(allHealthy ? 200 : 503).json(detailedHealth);
    }
    catch (error) {
        const errorId = structured_logger_1.StructuredLogger.logError('detailed_health_check', error, {}, correlationId);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            correlationId,
            errorId,
            message: 'Detailed health check failed'
        });
    }
}));
/**
 * Health check específico para base de datos
 */
function checkDatabase(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const startTime = Date.now();
            const result = yield (supabase_1.supabase === null || supabase_1.supabase === void 0 ? void 0 : supabase_1.supabase.from('agents').select('count').limit(1));
            const duration = Date.now() - startTime;
            if (!result) {
                structured_logger_1.StructuredLogger.logError('database_health_check', new Error('Supabase client not available'), { duration }, correlationId);
                return {
                    status: 'error',
                    details: 'Supabase client not available',
                    responseTime: duration
                };
            }
            const { data, error } = result;
            if (error) {
                structured_logger_1.StructuredLogger.logError('database_health_check', error, { duration }, correlationId);
                return {
                    status: 'error',
                    details: error.message,
                    responseTime: duration
                };
            }
            structured_logger_1.StructuredLogger.logDatabaseEvent('health_check', 'agents', { duration }, correlationId);
            return {
                status: 'ok',
                details: 'Database connection successful',
                responseTime: duration
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('database_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage,
                responseTime: -1
            };
        }
    });
}
/**
 * Health check detallado para base de datos
 */
function checkDatabaseDetailed(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const startTime = Date.now();
            // Verificar múltiples tablas
            const checks = yield Promise.allSettled([
                supabase_1.supabase === null || supabase_1.supabase === void 0 ? void 0 : supabase_1.supabase.from('agents').select('count').limit(1),
                supabase_1.supabase === null || supabase_1.supabase === void 0 ? void 0 : supabase_1.supabase.from('contacts').select('count').limit(1),
                supabase_1.supabase === null || supabase_1.supabase === void 0 ? void 0 : supabase_1.supabase.from('conversations').select('count').limit(1),
                supabase_1.supabase === null || supabase_1.supabase === void 0 ? void 0 : supabase_1.supabase.from('messages').select('count').limit(1)
            ]);
            const duration = Date.now() - startTime;
            const tables = ['agents', 'contacts', 'conversations', 'messages'];
            const results = checks.map((check, index) => ({
                table: tables[index],
                status: check.status === 'fulfilled' && check.value && !check.value.error ? 'ok' : 'error',
                error: check.status === 'rejected' ? (check.reason instanceof Error ? check.reason.message : 'Unknown error') :
                    (check.status === 'fulfilled' && check.value && check.value.error ? check.value.error.message : null)
            }));
            const allTablesHealthy = results.every(r => r.status === 'ok');
            return {
                status: allTablesHealthy ? 'ok' : 'degraded',
                details: 'Database detailed check',
                responseTime: duration,
                tables: results
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('database_detailed_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage,
                responseTime: -1,
                tables: []
            };
        }
    });
}
/**
 * Health check para WhatsApp API
 */
function checkWhatsAppAPI(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const startTime = Date.now();
            const result = yield whatsapp_service_1.whatsappService.getPhoneNumberInfo();
            const duration = Date.now() - startTime;
            if (!result.success) {
                structured_logger_1.StructuredLogger.logWhatsAppEvent('health_check_failed', { error: result.error, duration }, correlationId);
                return {
                    status: 'error',
                    details: result.error,
                    responseTime: duration
                };
            }
            structured_logger_1.StructuredLogger.logWhatsAppEvent('health_check_success', { duration }, correlationId);
            return {
                status: 'ok',
                details: 'WhatsApp API connection successful',
                responseTime: duration
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('whatsapp_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage,
                responseTime: -1
            };
        }
    });
}
/**
 * Health check detallado para WhatsApp API
 */
function checkWhatsAppDetailed(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const startTime = Date.now();
            const result = yield whatsapp_service_1.whatsappService.getPhoneNumberInfo();
            const duration = Date.now() - startTime;
            if (!result.success) {
                return {
                    status: 'error',
                    details: result.error,
                    responseTime: duration,
                    phoneNumberInfo: null
                };
            }
            return {
                status: 'ok',
                details: 'WhatsApp API detailed check successful',
                responseTime: duration,
                phoneNumberInfo: {
                    hasData: !!result.data,
                    verified: ((_a = result.data) === null || _a === void 0 ? void 0 : _a.verified_name) || 'unknown'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('whatsapp_detailed_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage,
                responseTime: -1,
                phoneNumberInfo: null
            };
        }
    });
}
/**
 * Health check para Supabase
 */
function checkSupabase(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const hasSupabase = !!supabase_1.supabase;
            const hasUrl = !!process.env.SUPABASE_URL;
            const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
            const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY);
            const allConfigured = hasSupabase && hasUrl && hasAnonKey && hasServiceKey;
            structured_logger_1.StructuredLogger.logSystemEvent('supabase_health_check', {
                hasSupabase,
                hasUrl,
                hasAnonKey,
                hasServiceKey,
                allConfigured,
                correlationId
            });
            return {
                status: allConfigured ? 'ok' : 'error',
                details: allConfigured ? 'Supabase client configured' : 'Supabase configuration incomplete'
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('supabase_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage
            };
        }
    });
}
/**
 * Health check detallado para Supabase
 */
function checkSupabaseDetailed(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const config = {
                hasClient: !!supabase_1.supabase,
                hasUrl: !!process.env.SUPABASE_URL,
                hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
                hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),
                urlLength: ((_a = process.env.SUPABASE_URL) === null || _a === void 0 ? void 0 : _a.length) || 0,
                anonKeyLength: ((_b = process.env.SUPABASE_ANON_KEY) === null || _b === void 0 ? void 0 : _b.length) || 0,
                serviceKeyLength: ((_c = (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) === null || _c === void 0 ? void 0 : _c.length) || 0
            };
            const allConfigured = config.hasClient && config.hasUrl && config.hasAnonKey && config.hasServiceKey;
            return {
                status: allConfigured ? 'ok' : 'error',
                details: allConfigured ? 'Supabase fully configured' : 'Supabase configuration issues',
                configuration: config
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            structured_logger_1.StructuredLogger.logError('supabase_detailed_health_check', error, {}, correlationId);
            return {
                status: 'error',
                details: errorMessage,
                configuration: null
            };
        }
    });
}
/**
 * Verificar uso de memoria
 */
function checkMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
    return {
        status: usagePercent > 90 ? 'warning' : 'ok',
        totalMB,
        usedMB,
        usagePercent,
        details: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`
    };
}
/**
 * Health check específico para migración de base de datos
 */
router.get('/health/database-migration', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    const correlationId = req.correlationId || `migration_health_${Date.now()}`;
    try {
        const metrics = unified_database_service_1.unifiedDatabaseService.getMetrics();
        const config = unified_database_service_1.unifiedDatabaseService.getConfig();
        // Ejecutar tests de validación
        const validationTests = yield Promise.allSettled([
            testLegacyMethod(correlationId),
            testOptimizedMethod(correlationId),
            testBatchOperations(correlationId)
        ]);
        const testResults = validationTests.map((test, index) => ({
            testName: ['legacy_method', 'optimized_method', 'batch_operations'][index],
            status: test.status,
            result: test.status === 'fulfilled' ? test.value : null,
            error: test.status === 'rejected' ? test.reason.message : null
        }));
        const allTestsPassed = testResults.every(t => t.status === 'fulfilled');
        const responseTime = Date.now() - startTime;
        const migrationHealth = {
            status: allTestsPassed ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            correlationId,
            responseTime,
            currentConfig: config,
            metrics,
            validationTests: testResults,
            recommendations: {
                shouldUseDirect: metrics.recommendedConfig.useDirectSupabase,
                shouldUseOptimized: metrics.recommendedConfig.useOptimizedQueries,
                shouldUseCircuitBreaker: metrics.recommendedConfig.useCircuitBreaker,
                migrationProgress: calculateMigrationProgress(metrics)
            }
        };
        structured_logger_1.StructuredLogger.logSystemEvent('migration_health_check_completed', {
            correlationId,
            status: migrationHealth.status,
            responseTime,
            testsPassed: allTestsPassed
        });
        res.status(allTestsPassed ? 200 : 503).json(migrationHealth);
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        const errorId = structured_logger_1.StructuredLogger.logError('health_check', error, {
            correlationId,
            responseTime
        });
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            correlationId,
            errorId,
            message: 'Health check failed',
            details: (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error',
            responseTime
        });
    }
}));
/**
 * Test método legacy
 */
function testLegacyMethod(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        try {
            // Test simple: obtener conversaciones usando método legacy
            const conversations = yield unified_database_service_1.unifiedDatabaseService.getConversations(5, 0);
            const duration = Date.now() - startTime;
            return {
                success: true,
                duration,
                resultCount: conversations.length,
                method: 'legacy'
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            structured_logger_1.StructuredLogger.logError('legacy_method_test', error, { correlationId, duration });
            throw error;
        }
    });
}
/**
 * Test método optimizado
 */
function testOptimizedMethod(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        try {
            // Temporalmente activar método optimizado para test
            const originalConfig = unified_database_service_1.unifiedDatabaseService.getConfig();
            unified_database_service_1.unifiedDatabaseService.updateConfig({ useOptimizedQueries: true });
            const conversations = yield unified_database_service_1.unifiedDatabaseService.getConversations(5, 0);
            const duration = Date.now() - startTime;
            // Restaurar configuración original
            unified_database_service_1.unifiedDatabaseService.updateConfig(originalConfig);
            return {
                success: true,
                duration,
                resultCount: conversations.length,
                method: 'optimized'
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            structured_logger_1.StructuredLogger.logError('optimized_method_test', error, { correlationId, duration });
            throw error;
        }
    });
}
/**
 * Test operaciones batch
 */
function testBatchOperations(correlationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        try {
            // Test simple: verificar que las operaciones batch están disponibles
            const config = unified_database_service_1.unifiedDatabaseService.getConfig();
            const duration = Date.now() - startTime;
            return {
                success: true,
                duration,
                batchOperationsEnabled: config.useBatchOperations,
                method: 'batch_test'
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            structured_logger_1.StructuredLogger.logError('batch_operations_test', error, { correlationId, duration });
            throw error;
        }
    });
}
/**
 * Calcular progreso de migración
 */
function calculateMigrationProgress(metrics) {
    const totalOperations = metrics.legacyOperations + metrics.optimizedOperations;
    if (totalOperations === 0) {
        return {
            percentage: 0,
            stage: 'not_started',
            recommendation: 'Begin with 10% traffic'
        };
    }
    const optimizedPercentage = (metrics.optimizedOperations / totalOperations) * 100;
    let stage = 'testing';
    let recommendation = 'Continue monitoring';
    if (optimizedPercentage < 10) {
        stage = 'initial_testing';
        recommendation = 'Increase to 25% traffic if metrics are good';
    }
    else if (optimizedPercentage < 50) {
        stage = 'gradual_rollout';
        recommendation = 'Increase to 75% traffic if error rate < 5%';
    }
    else if (optimizedPercentage < 90) {
        stage = 'majority_rollout';
        recommendation = 'Complete migration if performance is better';
    }
    else {
        stage = 'migration_complete';
        recommendation = 'Consider removing legacy code';
    }
    return {
        percentage: Math.round(optimizedPercentage),
        stage,
        recommendation,
        totalOperations,
        errorRate: metrics.errorRate
    };
}
exports.default = router;
