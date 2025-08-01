import rateLimit from 'express-rate-limit';

// Rate limit para autenticación
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  message: {
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
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