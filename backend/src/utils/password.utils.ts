// Carga perezosa de bcrypt con fallback a bcryptjs para evitar problemas de compilación en Windows
let bcryptLib: any;
function getBcrypt(): any {
  if (bcryptLib) return bcryptLib;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    bcryptLib = require('bcrypt');
  } catch (_) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      bcryptLib = require('bcryptjs');
    } catch (e) {
      throw new Error('No se pudo cargar bcrypt ni bcryptjs. Instala al menos uno de ellos.');
    }
  }
  return bcryptLib;
}
import { logger } from './logger';

/**
 * Utilidades para manejo seguro de contraseñas
 */
export class PasswordUtils {
  // Número de rounds para bcrypt (12 es un buen balance entre seguridad y rendimiento)
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash de una contraseña usando bcrypt
   * @param plainPassword Contraseña en texto plano
   * @returns Hash de la contraseña
   */
  static async hashPassword(plainPassword: string): Promise<string> {
    try {
      if (!plainPassword || plainPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const bcrypt = getBcrypt();
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      
      logger.debug('Contraseña hasheada exitosamente');
      return hashedPassword;
    } catch (error) {
      logger.error('Error al hashear contraseña:', error);
      throw new Error('Error al procesar la contraseña');
    }
  }

  /**
   * Verificar una contraseña contra su hash
   * @param plainPassword Contraseña en texto plano
   * @param hashedPassword Hash almacenado
   * @returns true si coincide, false si no
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!plainPassword || !hashedPassword) {
        return false;
      }

      const bcrypt = getBcrypt();
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      logger.debug(`Verificación de contraseña: ${isMatch ? 'exitosa' : 'fallida'}`);
      
      return isMatch;
    } catch (error) {
      logger.error('Error al verificar contraseña:', error);
      return false;
    }
  }

  /**
   * Verificar si una contraseña está hasheada con bcrypt
   * @param password Contraseña a verificar
   * @returns true si está hasheada, false si es texto plano
   */
  static isPasswordHashed(password: string): boolean {
    // Los hashes de bcrypt empiezan con $2a$, $2b$ o $2y$
    return /^\$2[aby]\$\d{2}\$/.test(password);
  }

  /**
   * Validar fortaleza de contraseña
   * @param password Contraseña a validar
   * @returns objeto con validación y mensaje
   */
  static validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (!password || password.length < 6) {
      return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
    }

    // Validaciones adicionales opcionales
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Para producción, puedes requerir más complejidad
    if (password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers) {
      return { isValid: true };
    }

    return { 
      isValid: true, // Por ahora solo validamos longitud mínima
      message: 'Recomendación: Use mayúsculas, minúsculas y números para mayor seguridad' 
    };
  }

  /**
   * Generar una contraseña temporal segura
   * @param length Longitud de la contraseña (default: 12)
   * @returns Contraseña generada
   */
  static generateTempPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}
