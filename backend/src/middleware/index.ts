/**
 * Exportación centralizada de middlewares
 * Facilita la migración al nuevo sistema unificado
 */

// Exportar el nuevo middleware unificado
export {
  authenticate,
  authMiddleware,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSupervisor,
  requirePermission,
  invalidateUserCache,
  clearUserCache
} from './auth-unified';

// Mantener exports legacy para compatibilidad temporal
// TODO: Eliminar después de migrar todo el código
import { authMiddleware as legacyAuth } from './auth-jwt';
export { legacyAuth };

// Middleware de rate limiting
export { rateLimitMiddleware } from './rate-limit';

// Middleware de validación
export { validateRequest } from './validation';

// Middleware de logging
export { requestLogger } from './request-logger';

// Middleware de manejo de errores
export { errorHandler } from './error-handler';
