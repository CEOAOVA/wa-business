import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { whatsappConfig } from '../config/whatsapp';

// Interface para extender Request con información de seguridad
export interface SecureRequest extends Request {
  webhookSecurity?: {
    signatureValid: boolean;
    requestId: string;
    timestamp: number;
  };
  rawBody?: string;
}

// Rate limiting simple en memoria (para producción usar Redis)
class SimpleRateLimit {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Obtener requests del cliente
    let clientRequests = this.requests.get(clientId) || [];
    
    // Filtrar requests dentro de la ventana de tiempo
    clientRequests = clientRequests.filter(time => time > windowStart);
    
    // Verificar si excede el límite
    if (clientRequests.length >= this.maxRequests) {
      return true;
    }
    
    // Agregar request actual
    clientRequests.push(now);
    this.requests.set(clientId, clientRequests);
    
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }
  }
}

// Instancia global de rate limiting
const rateLimiter = new SimpleRateLimit(
  whatsappConfig.security.rateLimit.windowMs,
  whatsappConfig.security.rateLimit.maxRequests
);

// Cleanup cada 5 minutos
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Verificar firma HMAC del webhook
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // WhatsApp envía la firma en formato "sha256=<hash>"
    const signatureHash = signature.replace('sha256=', '');
    
    // Calcular HMAC usando el payload y el secret
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Comparación segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    console.error('❌ Error verificando firma webhook:', error);
    return false;
  }
}

/**
 * Middleware de verificación de seguridad de webhooks
 */
export const webhookSecurity = (req: SecureRequest, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`🔒 [${requestId}] Verificando seguridad webhook desde IP: ${clientIp}`);

  // 1. Rate Limiting
  if (rateLimiter.isRateLimited(clientIp)) {
    console.warn(`⚠️ [${requestId}] Rate limit excedido para IP: ${clientIp}`);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(whatsappConfig.security.rateLimit.windowMs / 1000)
    });
  }

  // 2. Verificación de User-Agent (Meta envía un UA específico)
  const validUserAgents = [
    'facebookplatform',
    'WhatsApp',
    'curl', // Para testing
    'axios', // Para testing
    'PostmanRuntime' // Para testing
  ];
  
  const hasValidUserAgent = validUserAgents.some(ua => 
    userAgent.toLowerCase().includes(ua.toLowerCase())
  );

  if (!hasValidUserAgent && whatsappConfig.server.nodeEnv === 'production') {
    console.warn(`⚠️ [${requestId}] User-Agent sospechoso: ${userAgent}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid User-Agent'
    });
  }

  // 3. Verificación de firma HMAC (si está configurada)
  let signatureValid = true;
  
  if (whatsappConfig.webhook.enableSignatureVerification && whatsappConfig.webhook.appSecret) {
    const signature = req.get('X-Hub-Signature-256');
    
    if (!signature) {
      console.warn(`⚠️ [${requestId}] Webhook sin firma HMAC`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature'
      });
    }

    // Para verificar la firma, necesitamos el raw body
    let rawBody = '';
    if (req.body) {
      rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    signatureValid = verifyWebhookSignature(
      rawBody,
      signature,
      whatsappConfig.webhook.appSecret
    );

    if (!signatureValid) {
      console.error(`❌ [${requestId}] Firma HMAC inválida para webhook`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
    }

    console.log(`✅ [${requestId}] Firma HMAC verificada correctamente`);
  }

  // 4. Validación básica de estructura
  if (req.method === 'POST') {
    if (!req.body || typeof req.body !== 'object') {
      console.warn(`⚠️ [${requestId}] Webhook con payload inválido`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload structure'
      });
    }

    // Verificar estructura básica de webhook de WhatsApp
    const { object, entry } = req.body;
    if (!object || !Array.isArray(entry)) {
      console.warn(`⚠️ [${requestId}] Estructura de webhook inválida`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid WhatsApp webhook structure'
      });
    }
  }

  // Agregar información de seguridad al request
  req.webhookSecurity = {
    signatureValid,
    requestId,
    timestamp: Date.now()
  };

  // Logging detallado si está habilitado
  if (whatsappConfig.security.enableDetailedLogging) {
    console.log(`📊 [${requestId}] Webhook security check passed:`, {
      ip: clientIp,
      userAgent,
      signatureValid,
      method: req.method,
      path: req.path,
      contentType: req.get('Content-Type')
    });
  }

  next();
};

/**
 * Middleware específico para raw body (necesario para verificación HMAC)
 */
export const captureRawBody = (req: any, res: Response, next: NextFunction) => {
  if (req.path === whatsappConfig.webhook.path && req.method === 'POST') {
    let rawBody = '';
    
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8');
    });
    
    req.on('end', () => {
      req.rawBody = rawBody;
      try {
        req.body = JSON.parse(rawBody);
      } catch (error) {
        req.body = rawBody;
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * Middleware de logging de seguridad
 */
export const securityLogger = (req: SecureRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
    const requestId = req.webhookSecurity?.requestId || 'unknown';
    
    console.log(`🛡️ [${level}] [${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    if (res.statusCode >= 400) {
      console.log(`⚠️ [${requestId}] Security alert:`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        path: req.path,
        method: req.method
      });
    }
  });
  
  next();
};

export { rateLimiter }; 