import rateLimit from 'express-rate-limit';

// Rate limit para autenticación - DESHABILITADO COMPLETAMENTE
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 999999, // Sin límite práctico
  message: {
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // SIEMPRE saltar rate limiting - sin restricciones
  skip: (req) => {
    return true; // Siempre saltar el rate limiting
  }
});

// Rate limit para WhatsApp API
export const whatsappRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto
  message: {
    error: 'Demasiadas solicitudes a WhatsApp API. Intenta de nuevo en 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
}); 