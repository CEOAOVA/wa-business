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
exports.TokenService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class TokenService {
    /**
     * Generar un par de tokens (access + refresh)
     */
    static generateTokenPair(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sessionId = (0, uuid_1.v4)();
                // Generar access token
                const accessToken = jwt.sign(Object.assign(Object.assign({}, payload), { type: 'access', sessionId }), this.JWT_SECRET, {
                    expiresIn: this.ACCESS_TOKEN_EXPIRY
                });
                // Generar refresh token
                const refreshToken = jwt.sign(Object.assign(Object.assign({}, payload), { type: 'refresh', sessionId }), this.REFRESH_SECRET, {
                    expiresIn: this.REFRESH_TOKEN_EXPIRY
                });
                // Calcular tiempos de expiración en segundos
                const accessExpiresIn = this.getExpiryInSeconds(this.ACCESS_TOKEN_EXPIRY);
                const refreshExpiresIn = this.getExpiryInSeconds(this.REFRESH_TOKEN_EXPIRY);
                // Guardar refresh token en base de datos
                yield this.saveRefreshToken({
                    user_id: payload.sub,
                    token: refreshToken,
                    expires_at: new Date(Date.now() + refreshExpiresIn * 1000)
                });
                logger_1.logger.info(`Token pair generated for user: ${payload.username}`);
                return {
                    accessToken,
                    refreshToken,
                    expiresIn: accessExpiresIn,
                    refreshExpiresIn: refreshExpiresIn
                };
            }
            catch (error) {
                logger_1.logger.error('Error generating token pair:', error);
                throw new Error('Error generating authentication tokens');
            }
        });
    }
    /**
     * Renovar access token usando refresh token
     */
    static refreshAccessToken(refreshToken, userAgent, ipAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar refresh token
                const decoded = jwt.verify(refreshToken, this.REFRESH_SECRET);
                if (decoded.type !== 'refresh') {
                    logger_1.logger.warn('Invalid token type for refresh');
                    return null;
                }
                // Verificar si el refresh token está activo en la base de datos
                const isValid = yield this.verifyRefreshToken(refreshToken, decoded.sub);
                if (!isValid) {
                    logger_1.logger.warn('Refresh token not found or inactive');
                    return null;
                }
                // Actualizar último uso del refresh token
                yield this.updateRefreshTokenUsage(refreshToken, userAgent, ipAddress);
                // Generar nuevo access token
                const accessToken = jwt.sign({
                    sub: decoded.sub,
                    email: decoded.email,
                    role: decoded.role,
                    username: decoded.username,
                    type: 'access',
                    sessionId: decoded.sessionId
                }, this.JWT_SECRET, {
                    expiresIn: this.ACCESS_TOKEN_EXPIRY
                });
                const expiresIn = this.getExpiryInSeconds(this.ACCESS_TOKEN_EXPIRY);
                logger_1.logger.info(`Access token refreshed for user: ${decoded.username}`);
                return {
                    accessToken,
                    expiresIn
                };
            }
            catch (error) {
                if (error instanceof jwt.TokenExpiredError) {
                    logger_1.logger.warn('Refresh token expired');
                }
                else if (error instanceof jwt.JsonWebTokenError) {
                    logger_1.logger.warn('Invalid refresh token');
                }
                else {
                    logger_1.logger.error('Error refreshing access token:', error);
                }
                return null;
            }
        });
    }
    /**
     * Verificar y decodificar access token
     */
    static verifyAccessToken(token) {
        try {
            if (!this.JWT_SECRET) {
                logger_1.logger.error('JWT_SECRET is not set');
                return null;
            }
            const decoded = jwt.verify(token, this.JWT_SECRET);
            if (decoded.type && decoded.type !== 'access') {
                logger_1.logger.warn('Invalid token type for access');
                return null;
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger_1.logger.debug('Access token expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                logger_1.logger.warn('Invalid access token');
            }
            return null;
        }
    }
    /**
     * Revocar refresh token
     */
    static revokeRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .update({
                    is_active: false,
                    revoked_at: new Date().toISOString()
                })
                    .eq('token', refreshToken);
                if (error) {
                    logger_1.logger.error('Error revoking refresh token:', error);
                    return false;
                }
                logger_1.logger.info('Refresh token revoked successfully');
                return true;
            }
            catch (error) {
                logger_1.logger.error('Error in revokeRefreshToken:', error);
                return false;
            }
        });
    }
    /**
     * Revocar todos los refresh tokens de un usuario
     */
    static revokeAllUserTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .update({
                    is_active: false,
                    revoked_at: new Date().toISOString()
                })
                    .eq('user_id', userId)
                    .eq('is_active', true);
                if (error) {
                    logger_1.logger.error('Error revoking all user tokens:', error);
                    return false;
                }
                logger_1.logger.info(`All refresh tokens revoked for user: ${userId}`);
                return true;
            }
            catch (error) {
                logger_1.logger.error('Error in revokeAllUserTokens:', error);
                return false;
            }
        });
    }
    /**
     * Limpiar tokens expirados (mantenimiento)
     */
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .delete()
                    .lt('expires_at', new Date().toISOString())
                    .select('id');
                if (error) {
                    logger_1.logger.error('Error cleaning up expired tokens:', error);
                    return 0;
                }
                const deletedCount = (data === null || data === void 0 ? void 0 : data.length) || 0;
                if (deletedCount > 0) {
                    logger_1.logger.info(`Cleaned up ${deletedCount} expired refresh tokens`);
                }
                return deletedCount;
            }
            catch (error) {
                logger_1.logger.error('Error in cleanupExpiredTokens:', error);
                return 0;
            }
        });
    }
    /**
     * Guardar refresh token en base de datos
     */
    static saveRefreshToken(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Supabase admin client not configured');
                }
                const { error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .insert({
                    id: (0, uuid_1.v4)(),
                    user_id: data.user_id,
                    token: data.token,
                    expires_at: data.expires_at.toISOString(),
                    is_active: true,
                    created_at: new Date().toISOString()
                });
                if (error) {
                    logger_1.logger.error('Error saving refresh token:', error);
                    throw new Error('Error saving refresh token');
                }
            }
            catch (error) {
                logger_1.logger.error('Error in saveRefreshToken:', error);
                throw error;
            }
        });
    }
    /**
     * Verificar si un refresh token es válido
     */
    static verifyRefreshToken(token, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .select('id, is_active, expires_at')
                    .eq('token', token)
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .single();
                if (error || !data) {
                    return false;
                }
                // Verificar si no ha expirado
                const expiresAt = new Date(data.expires_at);
                return expiresAt > new Date();
            }
            catch (error) {
                logger_1.logger.error('Error verifying refresh token:', error);
                return false;
            }
        });
    }
    /**
     * Actualizar último uso del refresh token
     */
    static updateRefreshTokenUsage(token, userAgent, ipAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateData = {
                    last_used: new Date().toISOString()
                };
                if (userAgent)
                    updateData.user_agent = userAgent;
                if (ipAddress)
                    updateData.ip_address = ipAddress;
                const { error } = yield supabase_1.supabaseAdmin
                    .from('refresh_tokens')
                    .update(updateData)
                    .eq('token', token);
                if (error) {
                    logger_1.logger.error('Error updating refresh token usage:', error);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in updateRefreshTokenUsage:', error);
            }
        });
    }
    /**
     * Convertir tiempo de expiración a segundos
     */
    static getExpiryInSeconds(expiry) {
        const ms = require('ms');
        return ms(expiry) / 1000;
    }
}
exports.TokenService = TokenService;
TokenService.ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
TokenService.REFRESH_TOKEN_EXPIRY = '7d';
TokenService.JWT_SECRET = process.env.JWT_SECRET;
TokenService.REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}-refresh`);
