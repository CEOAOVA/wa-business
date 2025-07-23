/**
 * Middleware de seguridad para WhatsApp Business Platform
 * Implementa CORS restrictivo, headers de seguridad y rate limiting
 */
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Configurar CORS restrictivo
 */
export const configureCORS = () => {
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Permitir requests sin origin (como Postman, apps móviles)
      if (!origin) return callback(null, true);
      
      // Obtener orígenes permitidos desde variables de entorno
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [
        'http://localhost:5173',
        'http://localhost:3002',
        'https://dev-waprueba.aova.mx'  // Frontend en dominio separado
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 [CORS] Origen bloqueado: ${origin}`);
        callback(new Error('Acceso bloqueado por política CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    credentials: true,
    maxAge: 86400 // 24 horas
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
        connectSrc: ["'self'", "https://api.openrouter.ai", "https://graph.facebook.com"],
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
 * Rate limiting general
 */
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por minuto
  message: {
    success: false,
    error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuración específica para Docker/proxy (igual que authRateLimit)
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
    console.warn(`[Security] ⚠️ Rate limit excedido para IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Rate limiting para autenticación
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: {
    success: false,
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
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