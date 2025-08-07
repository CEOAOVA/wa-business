import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  username: string;
  type?: 'access' | 'refresh';
  sessionId?: string;
}

interface RefreshTokenData {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  last_used?: Date;
  user_agent?: string;
  ip_address?: string;
}

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
  private static readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${TokenService.JWT_SECRET}-refresh`;

  /**
   * Generar un par de tokens (access + refresh)
   */
  static async generateTokenPair(payload: Omit<TokenPayload, 'type' | 'sessionId'>): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    try {
      const sessionId = uuidv4();
      
      // Generar access token
      const accessToken = jwt.sign(
        {
          ...payload,
          type: 'access',
          sessionId
        },
        this.JWT_SECRET,
        {
          expiresIn: this.ACCESS_TOKEN_EXPIRY
        }
      );

      // Generar refresh token
      const refreshToken = jwt.sign(
        {
          ...payload,
          type: 'refresh',
          sessionId
        },
        this.REFRESH_SECRET,
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRY
        }
      );

      // Calcular tiempos de expiración en segundos
      const accessExpiresIn = this.getExpiryInSeconds(this.ACCESS_TOKEN_EXPIRY);
      const refreshExpiresIn = this.getExpiryInSeconds(this.REFRESH_TOKEN_EXPIRY);

      // Guardar refresh token en base de datos
      await this.saveRefreshToken({
        user_id: payload.sub,
        token: refreshToken,
        expires_at: new Date(Date.now() + refreshExpiresIn * 1000)
      });

      logger.info(`Token pair generated for user: ${payload.username}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: accessExpiresIn,
        refreshExpiresIn: refreshExpiresIn
      };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new Error('Error generating authentication tokens');
    }
  }

  /**
   * Renovar access token usando refresh token
   */
  static async refreshAccessToken(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<{
    accessToken: string;
    expiresIn: number;
  } | null> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, this.REFRESH_SECRET) as TokenPayload;
      
      if (decoded.type !== 'refresh') {
        logger.warn('Invalid token type for refresh');
        return null;
      }

      // Verificar si el refresh token está activo en la base de datos
      const isValid = await this.verifyRefreshToken(refreshToken, decoded.sub);
      if (!isValid) {
        logger.warn('Refresh token not found or inactive');
        return null;
      }

      // Actualizar último uso del refresh token
      await this.updateRefreshTokenUsage(refreshToken, userAgent, ipAddress);

      // Generar nuevo access token
      const accessToken = jwt.sign(
        {
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          username: decoded.username,
          type: 'access',
          sessionId: decoded.sessionId
        },
        this.JWT_SECRET,
        {
          expiresIn: this.ACCESS_TOKEN_EXPIRY
        }
      );

      const expiresIn = this.getExpiryInSeconds(this.ACCESS_TOKEN_EXPIRY);

      logger.info(`Access token refreshed for user: ${decoded.username}`);

      return {
        accessToken,
        expiresIn
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token');
      } else {
        logger.error('Error refreshing access token:', error);
      }
      return null;
    }
  }

  /**
   * Verificar y decodificar access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      if (decoded.type && decoded.type !== 'access') {
        logger.warn('Invalid token type for access');
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token');
      }
      return null;
    }
  }

  /**
   * Revocar refresh token
   */
  static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('token', refreshToken);

      if (error) {
        logger.error('Error revoking refresh token:', error);
        return false;
      }

      logger.info('Refresh token revoked successfully');
      return true;
    } catch (error) {
      logger.error('Error in revokeRefreshToken:', error);
      return false;
    }
  }

  /**
   * Revocar todos los refresh tokens de un usuario
   */
  static async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error revoking all user tokens:', error);
        return false;
      }

      logger.info(`All refresh tokens revoked for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error in revokeAllUserTokens:', error);
      return false;
    }
  }

  /**
   * Limpiar tokens expirados (mantenimiento)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        logger.error('Error cleaning up expired tokens:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired refresh tokens`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error in cleanupExpiredTokens:', error);
      return 0;
    }
  }

  /**
   * Guardar refresh token en base de datos
   */
  private static async saveRefreshToken(data: {
    user_id: string;
    token: string;
    expires_at: Date;
  }): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .insert({
          id: uuidv4(),
          user_id: data.user_id,
          token: data.token,
          expires_at: data.expires_at.toISOString(),
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Error saving refresh token:', error);
        throw new Error('Error saving refresh token');
      }
    } catch (error) {
      logger.error('Error in saveRefreshToken:', error);
      throw error;
    }
  }

  /**
   * Verificar si un refresh token es válido
   */
  private static async verifyRefreshToken(token: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
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
    } catch (error) {
      logger.error('Error verifying refresh token:', error);
      return false;
    }
  }

  /**
   * Actualizar último uso del refresh token
   */
  private static async updateRefreshTokenUsage(
    token: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        last_used: new Date().toISOString()
      };

      if (userAgent) updateData.user_agent = userAgent;
      if (ipAddress) updateData.ip_address = ipAddress;

      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .update(updateData)
        .eq('token', token);

      if (error) {
        logger.error('Error updating refresh token usage:', error);
      }
    } catch (error) {
      logger.error('Error in updateRefreshTokenUsage:', error);
    }
  }

  /**
   * Convertir tiempo de expiración a segundos
   */
  private static getExpiryInSeconds(expiry: string): number {
    const ms = require('ms');
    return ms(expiry) / 1000;
  }
}
