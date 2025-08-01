/**
 * Middleware de seguridad para WhatsApp Business Platform
 * Implementa CORS restrictivo, headers de seguridad y rate limiting
 */
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';
import { Request, Response, NextFunction } from 'express';

/**
 * OPTIMIZADO: Configuración CORS dinámica por ambiente
 */
export const configureCORS = () => {
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Permitir requests sin origin (como Postman, apps móviles)
      if (!origin) return callback(null, true);
      
      // Configuración dinámica por ambiente
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Obtener orígenes permitidos desde variables de entorno
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [
        'http://localhost:5173',
        'http://localhost:3002',
        'http://localhost:3000',
        'https://dev-waprueba.aova.mx'
      ];
      
      // Agregar orígenes adicionales según ambiente
      const additionalOrigins = [];
      if (isDevelopment) {
        additionalOrigins.push(
          'http://localhost:*',
          'http://127.0.0.1:*',
          'https://localhost:*'
        );
      }
      
      if (isProduction) {
        // En producción, solo orígenes específicos
        const productionOrigins = process.env.PRODUCTION_CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
        additionalOrigins.push(...productionOrigins);
      }
      
      const allAllowedOrigins = [...allowedOrigins, ...additionalOrigins];
      
      // Verificar si el origen está permitido
      const isAllowed = allAllowedOrigins.some(allowed => {
        // Soporte para wildcards en desarrollo
        if (isDevelopment && allowed.includes('*')) {
          const baseUrl = allowed.replace('*', '');
          return origin.startsWith(baseUrl);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`🚫 [CORS] Origen bloqueado: ${origin} (Ambiente: ${process.env.NODE_ENV})`);
        callback(new Error('Acceso bloqueado por política CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Client-Name'
    ],
    credentials: true,
    maxAge: 86400, // 24 horas
    // OPTIMIZADO: Configuración específica para WebSocket
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  return cors(corsOptions);
};

/**
 * Configurar headers de seguridad con Helmet
 */
export const configureSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openrouter.ai", "https://graph.facebook.com", "https://dev-waprueba.aova.mx"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necesario para algunas APIs
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true
    }
  });
};

/**
 * Rate limiting inteligente por tipo de endpoint
 */
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '30000'), // REDUCIDO a 30 segundos
  max: (req) => {
    // Rate limiting diferenciado por tipo de endpoint
    const path = req.path;
    
    if (path.startsWith('/api/auth')) {
      return process.env.NODE_ENV === 'production' ? 10 : 5; // Auth: 10 requests/minuto
    }
    
    if (path.startsWith('/api/chat')) {
      return process.env.NODE_ENV === 'production' ? 100 : 50; // Chat: 100 requests/minuto
    }
    
    if (path.startsWith('/api/media')) {
      return process.env.NODE_ENV === 'production' ? 50 : 20; // Media: 50 requests/minuto
    }
    
    if (path.startsWith('/socket.io/')) {
      return 0; // Sin límites para WebSocket
    }
    
    // Rate limiting general para otros endpoints
    return process.env.NODE_ENV === 'production' ? 200 : 80;
  },
  message: {
    success: false,
    error: 'Demasiadas peticiones. Intenta de nuevo en 30 segundos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuración mejorada para rate limiting por usuario autenticado
  keyGenerator: (req) => {
    // Priorizar usuario autenticado sobre IP
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    
    // Usar X-Forwarded-For si está disponible, sino usar req.ip
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    
    // En producción, usar una clave más específica que incluya User-Agent
    if (process.env.NODE_ENV === 'production') {
      const userAgent = req.headers['user-agent'] || 'unknown';
      return `${ip}-${userAgent.substring(0, 20)}`;
    }
    
    return ip || 'unknown';
  },
  skip: (req) => {
    // Saltar rate limiting para IPs locales en desarrollo
    const ip = req.ip || '';
    const isLocalDev = process.env.NODE_ENV === 'development' && (ip.includes('127.0.0.1') || ip.includes('::1'));
    
    // Saltar para WebSocket connections
    const isWebSocket = req.path.startsWith('/socket.io/');
    
    // Saltar para health checks
    const isHealthCheck = req.path === '/health';
    
    return isLocalDev || isWebSocket || isHealthCheck;
  },
  handler: (req, res) => {
    const path = req.path;
    console.warn(`[Security] ⚠️ Rate limit excedido para ${path} - IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Demasiadas peticiones. Intenta de nuevo en 30 segundos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 30
    });
  }
});

/**
 * Rate limiting para autenticación
 */
export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos (aumentar de 15 min)
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Más permisivo
  message: {
    success: false,
    error: 'Demasiados intentos de login. Intenta de nuevo en 5 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuración específica para Docker/proxy
  keyGenerator: (req) => {
    // Usar X-Forwarded-For si está disponible, sino usar req.ip
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    
    // En producción, usar una clave más específica que incluya User-Agent
    if (process.env.NODE_ENV === 'production') {
      const userAgent = req.headers['user-agent'] || 'unknown';
      return `${ip}-${userAgent.substring(0, 20)}`;
    }
    
    return ip || 'unknown';
  },
  skip: (req) => {
    // Saltar rate limiting para IPs locales en desarrollo
    const ip = req.ip || '';
    return process.env.NODE_ENV === 'development' && (ip.includes('127.0.0.1') || ip.includes('::1'));
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit excedido', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      error: 'Demasiados intentos de login. Intenta de nuevo en 5 minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// NUEVO: Rate limit específico para WhatsApp API
export const whatsappRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minuto
  max: 30,                   // 30 requests por minuto
  message: {
    success: false,
    error: 'Límite de WhatsApp API excedido',
    code: 'WHATSAPP_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + req.path,
  handler: (req, res) => {
    logger.warn('WhatsApp API rate limit excedido', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      error: 'Límite de WhatsApp API excedido',
      code: 'WHATSAPP_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Rate limiting para webhooks (más permisivo)
 */
export const webhookRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WEBHOOK_WINDOW || '60000'), // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX || '200'), // 200 requests por minuto
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuración específica para Docker/proxy
  keyGenerator: (req) => {
    // Usar X-Forwarded-For si está disponible, sino usar req.ip
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    return ip || 'unknown';
  },
  skip: (req) => {
    // Saltar rate limiting para IPs locales en desarrollo
    const ip = req.ip || '';
    return process.env.NODE_ENV === 'development' && (ip.includes('127.0.0.1') || ip.includes('::1'));
  },
  handler: (req, res) => {
    console.warn(`[Security] ⚠️ Webhook rate limit excedido para IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Webhook rate limit exceeded',
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Middleware de logging de seguridad
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const url = req.url;
  const origin = req.get('Origin') || 'No origin';

  // Log detallado solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security] ${timestamp} - ${ip} - ${method} ${url} - ${userAgent} - Origin: ${origin}`);
  }

  // En producción, solo logear requests sospechosos
  if (process.env.NODE_ENV === 'production') {
    // Detectar patrones sospechosos
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /eval\(/i,  // Code injection
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(userAgent)
    );

    if (isSuspicious) {
      console.warn(`[Security] 🚨 Suspicious request: ${ip} - ${method} ${url} - ${userAgent}`);
    }
  }

  next();
};

/**
 * Middleware para validar User-Agent (con excepciones para APIs)
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || 'unknown';
  const requestPath = req.path || req.url || '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Log para debugging
  console.log(`[Security] ValidateUserAgent: ${req.method} ${requestPath}, UA: ${userAgent.substring(0, 50)}, ENV: ${nodeEnv}`);

  // Excluir rutas de API de la validación estricta de User-Agent
  // Las APIs tienen sus propios mecanismos de autenticación y seguridad
  if (requestPath.startsWith('/api/') || req.url?.startsWith('/api/')) {
    console.log(`[Security] ✅ Ruta API excluida de validación User-Agent: ${requestPath}`);
    return next();
  }

  // Solo aplicar en producción
  if (nodeEnv !== 'production') {
    console.log(`[Security] ✅ Modo desarrollo - User-Agent no validado: ${nodeEnv}`);
    return next();
  }

  if (!userAgent || userAgent === 'unknown') {
    console.warn(`[Security] ⚠️ Request sin User-Agent desde IP: ${req.ip}`);
    return res.status(400).json({
      success: false,
      error: 'User-Agent requerido',
      code: 'MISSING_USER_AGENT'
    });
  }

  // Lista de User-Agents permitidos (incluyendo Meta/WhatsApp)
  const allowedUserAgents = [
    // Navegadores modernos
    /Mozilla\/5\.0/,
    /Chrome/,
    /Firefox/,
    /Safari/,
    /Edge/,
    
    // Herramientas de testing
    /PostmanRuntime/,
    /curl/,
    /axios/,
    /node/,
    
    // WhatsApp y Meta
    /WhatsApp/i,
    /facebookplatform/i,
    /Meta/i,
    /facebook/i,
    
    // APIs y bots legítimos
    /webhook/i,
    /test/i  // Para testing
  ];

  const isAllowed = allowedUserAgents.some(pattern => pattern.test(userAgent));
  
  if (!isAllowed) {
    console.warn(`[Security] ⚠️ User-Agent no permitido: ${userAgent} desde IP: ${req.ip} para ruta: ${requestPath}`);
    return res.status(403).json({
      success: false,
      error: 'User-Agent no permitido',
      code: 'FORBIDDEN_USER_AGENT'
    });
  }

  console.log(`[Security] ✅ User-Agent permitido: ${userAgent.substring(0, 30)}`);
  next();
};

/**
 * Aplicar toda la configuración de seguridad
 */
export const applySecurity = (app: any) => {
  console.log('[Security] 🔒 Aplicando configuración de seguridad...');
  
  // Headers de seguridad
  app.use(configureSecurityHeaders());
  
  // CORS restrictivo
  app.use(configureCORS());
  
  // Rate limiting general
  app.use(generalRateLimit);
  
  // Logging de seguridad
  app.use(securityLogger);
  
  // Validación de User-Agent solo si está habilitada explícitamente
  const disableUserAgentValidation = process.env.DISABLE_USER_AGENT_VALIDATION === 'true' || process.env.NODE_ENV === 'development';
  
  if (!disableUserAgentValidation) {
    console.log('[Security] 🔍 User-Agent validation habilitada');
    app.use(validateUserAgent);
  } else {
    console.log('[Security] ⚠️ User-Agent validation DESACTIVADA (desarrollo o configuración manual)');
  }
  
  console.log('[Security] ✅ Configuración de seguridad aplicada');
}; 