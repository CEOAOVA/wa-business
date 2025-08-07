/**
 * Middleware de Rate Limiting Mejorado
 * Combina rate limiting por IP y usuario con soporte para Redis
 */
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis, IRateLimiterOptions } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Configuración de Redis (opcional)
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Tipos para configuración
interface RateLimitConfig {
  points: number;          // Número de requests permitidos
  duration: number;        // Ventana de tiempo en segundos
  blockDuration?: number;  // Tiempo de bloqueo después de exceder límite (segundos)
  keyPrefix?: string;      // Prefijo para las claves
  skipSuccessfulRequests?: boolean; // No contar requests exitosos
  skipFailedRequests?: boolean;     // No contar requests fallidos
}

// Configuraciones predefinidas por tipo de endpoint
const RATE_LIMIT_CONFIGS = {
  // Autenticación: más restrictivo
  auth: {
    points: 5,
    duration: 60,
    blockDuration: 900, // 15 minutos de bloqueo
    keyPrefix: 'auth'
  },
  
  // API general: moderado
  api: {
    points: 100,
    duration: 60,
    keyPrefix: 'api'
  },
  
  // Webhooks: más permisivo
  webhook: {
    points: 300,
    duration: 60,
    keyPrefix: 'webhook'
  },
  
  // Chat/mensajes: alto volumen permitido
  chat: {
    points: 200,
    duration: 60,
    keyPrefix: 'chat'
  },
  
  // Media/archivos: limitado por tamaño
  media: {
    points: 50,
    duration: 60,
    blockDuration: 300,
    keyPrefix: 'media'
  }
};

// Cache de rate limiters por configuración
const rateLimiters = new Map<string, RateLimiterMemory | RateLimiterRedis>();

/**
 * Obtener o crear rate limiter
 */
function getRateLimiter(config: RateLimitConfig): RateLimiterMemory | RateLimiterRedis {
  const key = `${config.keyPrefix}-${config.points}-${config.duration}`;
  
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!;
  }
  
  const options: IRateLimiterOptions = {
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
    keyPrefix: config.keyPrefix,
  };
  
  // Usar Redis si está disponible, sino memoria
  const limiter = redisClient 
    ? new RateLimiterRedis({
        storeClient: redisClient,
        ...options
      })
    : new RateLimiterMemory(options);
  
  rateLimiters.set(key, limiter);
  return limiter;
}

/**
 * Generar clave única para rate limiting
 */
function generateKey(req: Request, useUserId: boolean = true): string {
  // Priorizar usuario autenticado
  if (useUserId && req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Obtener IP real considerando proxies
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.ip || req.connection.remoteAddress || 'unknown';
  
  // En producción, incluir User-Agent para mayor granularidad
  if (process.env.NODE_ENV === 'production') {
    const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, 50);
    return `ip:${ip}:${userAgent}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Middleware factory para rate limiting
 */
export function createRateLimitMiddleware(
  configName: keyof typeof RATE_LIMIT_CONFIGS | RateLimitConfig
) {
  const config = typeof configName === 'string' 
    ? RATE_LIMIT_CONFIGS[configName]
    : configName;
    
  const limiter = getRateLimiter(config);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip para rutas excluidas
    if (shouldSkipRateLimit(req)) {
      return next();
    }
    
    const key = generateKey(req);
    
    try {
      const result = await limiter.consume(key);
      
      // Agregar headers informativos
      res.set({
        'X-RateLimit-Limit': config.points.toString(),
        'X-RateLimit-Remaining': result.remainingPoints.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
      });
      
      next();
    } catch (rejResult: any) {
      // Rate limit excedido
      const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
      
      logger.warn('Rate limit exceeded', {
        key,
        path: req.path,
        method: req.method,
        remainingPoints: rejResult.remainingPoints || 0,
        retryAfter
      });
      
      res.set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': config.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rejResult.msBeforeNext).toISOString()
      });
      
      res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      });
    }
  };
}

/**
 * Rate limiting por usuario autenticado (más estricto)
 */
export function createUserRateLimitMiddleware(
  points: number = 100,
  duration: number = 60
) {
  const config: RateLimitConfig = {
    points,
    duration,
    keyPrefix: 'user-custom',
    blockDuration: 300
  };
  
  const limiter = getRateLimiter(config);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return next(); // No aplicar si no hay usuario
    }
    
    const key = `user:${req.user.id}`;
    
    try {
      await limiter.consume(key);
      next();
    } catch (rejResult: any) {
      const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
      
      logger.warn('User rate limit exceeded', {
        userId: req.user.id,
        username: req.user.username,
        path: req.path,
        retryAfter
      });
      
      res.status(429).json({
        success: false,
        message: 'Has excedido el límite de solicitudes. Por favor, espera un momento.',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter
      });
    }
  };
}

/**
 * Rate limiting dinámico basado en el comportamiento
 */
export function createDynamicRateLimitMiddleware() {
  // Tracking de comportamiento por IP/usuario
  const behaviorMap = new Map<string, { 
    failedAttempts: number; 
    lastReset: number;
  }>();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = generateKey(req);
    const now = Date.now();
    
    // Obtener o crear registro de comportamiento
    let behavior = behaviorMap.get(key);
    if (!behavior || now - behavior.lastReset > 3600000) { // Reset cada hora
      behavior = { failedAttempts: 0, lastReset: now };
      behaviorMap.set(key, behavior);
    }
    
    // Calcular límite dinámico basado en comportamiento
    const basePoints = 100;
    const penalty = Math.min(behavior.failedAttempts * 10, 50); // Max 50% de penalización
    const dynamicPoints = Math.max(basePoints - penalty, 20); // Mínimo 20 requests
    
    const config: RateLimitConfig = {
      points: dynamicPoints,
      duration: 60,
      keyPrefix: 'dynamic'
    };
    
    const limiter = getRateLimiter(config);
    
    try {
      await limiter.consume(key);
      
      // Registrar respuesta después
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          behavior!.failedAttempts++;
        } else if (behavior!.failedAttempts > 0) {
          behavior!.failedAttempts--; // Reducir penalización en requests exitosos
        }
      });
      
      next();
    } catch (rejResult: any) {
      behavior.failedAttempts++;
      
      const retryAfter = Math.round(rejResult.msBeforeNext / 1000) || 60;
      
      res.status(429).json({
        success: false,
        message: 'Actividad sospechosa detectada. Límite de solicitudes reducido.',
        code: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
        retryAfter
      });
    }
  };
}

/**
 * Determinar si se debe saltar rate limiting
 */
function shouldSkipRateLimit(req: Request): boolean {
  // Skip para rutas de salud
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }
  
  // Skip para WebSocket
  if (req.path.startsWith('/socket.io/')) {
    return true;
  }
  
  // Skip en desarrollo para localhost
  if (process.env.NODE_ENV === 'development') {
    const ip = req.ip || '';
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === '::ffff:127.0.0.1') {
      return true;
    }
  }
  
  return false;
}

/**
 * Resetear límites para un usuario/IP específico
 */
export async function resetRateLimit(identifier: string, keyPrefix?: string) {
  try {
    for (const [key, limiter] of rateLimiters) {
      if (!keyPrefix || key.startsWith(keyPrefix)) {
        await limiter.delete(identifier);
      }
    }
    logger.info(`Rate limits reset for: ${identifier}`);
  } catch (error) {
    logger.error('Error resetting rate limits:', error);
  }
}

/**
 * Obtener estadísticas de rate limiting
 */
export async function getRateLimitStats(identifier: string) {
  const stats: Record<string, any> = {};
  
  for (const [key, limiter] of rateLimiters) {
    try {
      const result = await limiter.get(identifier);
      if (result) {
        stats[key] = {
          consumedPoints: result.consumedPoints,
          remainingPoints: result.remainingPoints,
          msBeforeNext: result.msBeforeNext
        };
      }
    } catch (error) {
      // Ignorar errores de claves no encontradas
    }
  }
  
  return stats;
}

// Exports predefinidos para uso común
export const rateLimitAuth = createRateLimitMiddleware('auth');
export const rateLimitApi = createRateLimitMiddleware('api');
export const rateLimitWebhook = createRateLimitMiddleware('webhook');
export const rateLimitChat = createRateLimitMiddleware('chat');
export const rateLimitMedia = createRateLimitMiddleware('media');

// Alias para compatibilidad
export const rateLimitMiddleware = rateLimitApi;
