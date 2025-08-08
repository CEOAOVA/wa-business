"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.PasswordUtils = void 0;
const bcrypt = __importStar(require("bcrypt"));
const logger_1 = require("./logger");
/**
 * Utilidades para manejo seguro de contraseñas
 */
class PasswordUtils {
    /**
     * Hash de una contraseña usando bcrypt
     * @param plainPassword Contraseña en texto plano
     * @returns Hash de la contraseña
     */
    static hashPassword(plainPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!plainPassword || plainPassword.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres');
                }
                const salt = yield bcrypt.genSalt(this.SALT_ROUNDS);
                const hashedPassword = yield bcrypt.hash(plainPassword, salt);
                logger_1.logger.debug('Contraseña hasheada exitosamente');
                return hashedPassword;
            }
            catch (error) {
                logger_1.logger.error('Error al hashear contraseña:', error);
                throw new Error('Error al procesar la contraseña');
            }
        });
    }
    /**
     * Verificar una contraseña contra su hash
     * @param plainPassword Contraseña en texto plano
     * @param hashedPassword Hash almacenado
     * @returns true si coincide, false si no
     */
    static verifyPassword(plainPassword, hashedPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!plainPassword || !hashedPassword) {
                    return false;
                }
                const isMatch = yield bcrypt.compare(plainPassword, hashedPassword);
                logger_1.logger.debug(`Verificación de contraseña: ${isMatch ? 'exitosa' : 'fallida'}`);
                return isMatch;
            }
            catch (error) {
                logger_1.logger.error('Error al verificar contraseña:', error);
                return false;
            }
        });
    }
    /**
     * Verificar si una contraseña está hasheada con bcrypt
     * @param password Contraseña a verificar
     * @returns true si está hasheada, false si es texto plano
     */
    static isPasswordHashed(password) {
        // Los hashes de bcrypt empiezan con $2a$, $2b$ o $2y$
        return /^\$2[aby]\$\d{2}\$/.test(password);
    }
    /**
     * Validar fortaleza de contraseña
     * @param password Contraseña a validar
     * @returns objeto con validación y mensaje
     */
    static validatePasswordStrength(password) {
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
    static generateTempPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
}
exports.PasswordUtils = PasswordUtils;
// Número de rounds para bcrypt (12 es un buen balance entre seguridad y rendimiento)
PasswordUtils.SALT_ROUNDS = 12;
