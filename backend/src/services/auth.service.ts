import { supabase, supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import * as jwt from 'jsonwebtoken';
import { PasswordUtils } from '../utils/password.utils';
import { TokenService } from './token.service';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'supervisor';
  whatsapp_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  full_name: string;
  email: string;
  password: string;
  role?: 'admin' | 'agent' | 'supervisor';
  whatsapp_id?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export class AuthService {
  /**
   * Crear un nuevo usuario
   */
  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      // Crear usuario en Supabase Auth usando el cliente administrativo
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role || 'agent'
        },
        email_confirm: true // Confirmar email automáticamente
      });

      if (authError) {
        logger.error('Error creating auth user:', authError);
        throw new Error(`Error creating user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from auth creation');
      }

      // Crear perfil de usuario en la tabla agents usando el cliente administrativo
      // Hashear la contraseña antes de guardarla
      const hashedPassword = await PasswordUtils.hashPassword(userData.password);
      
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('agents')
        .insert({
          id: authData.user.id,
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role || 'agent',
          password: hashedPassword, // Guardar el hash, no la contraseña en texto plano
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        logger.error('Error creating user profile:', profileError);
        throw new Error(`Error creating user profile: ${profileError.message}`);
      }

      logger.info(`User created successfully: ${userData.email}`);
      return profileData;
    } catch (error) {
      logger.error('Error in createUser:', error);
      throw error;
    }
  }

  /**
   * Autenticar usuario validando directamente contra tabla agents
   */
  static async login(loginData: LoginData): Promise<{ user: UserProfile; session: any }> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación no disponible');
      }

      // Buscar usuario por username en tabla agents
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('username', loginData.username)
        .single();

      if (agentError || !agent) {
        logger.error(`Usuario no encontrado: ${loginData.username}`);
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Verificar contraseña usando bcrypt
      let isPasswordValid = false;
      
      // Verificar si la contraseña está hasheada o en texto plano (para migración)
      if (PasswordUtils.isPasswordHashed(agent.password)) {
        // Si está hasheada, usar bcrypt.compare
        isPasswordValid = await PasswordUtils.verifyPassword(loginData.password, agent.password);
      } else {
        // Si está en texto plano, comparar directamente (solo durante migración)
        isPasswordValid = agent.password === loginData.password;
        
        // Log para identificar usuarios que necesitan migración
        logger.warn(`Usuario ${loginData.username} tiene contraseña en texto plano - necesita migración`);
      }
      
      if (!isPasswordValid) {
        logger.error(`Contraseña incorrecta para usuario: ${loginData.username}`);
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Verificar si el usuario está activo
      if (!agent.is_active) {
        logger.warn(`Usuario inactivo intentando acceder: ${loginData.username}`);
        throw new Error('Usuario inactivo');
      }

      // Crear perfil de usuario para retornar
      const profileData: UserProfile = {
        id: agent.id,
        username: agent.username,
        full_name: agent.full_name || agent.username,
        email: agent.email || `${agent.username}@local`,
        role: agent.role || 'agent',
        whatsapp_id: agent.whatsapp_id,
        is_active: agent.is_active,
        created_at: agent.created_at,
        updated_at: agent.updated_at
      };

      // Generar par de tokens usando TokenService
      const tokenPair = await TokenService.generateTokenPair({
        sub: agent.id,
        email: agent.email || agent.username,
        role: agent.role,
        username: agent.username
      });

      // Crear sesión compatible con el frontend
      const session = {
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
        token_type: 'bearer',
        expires_in: tokenPair.expiresIn,
        expires_at: Math.floor(Date.now() / 1000) + tokenPair.expiresIn,
        refresh_expires_in: tokenPair.refreshExpiresIn,
        refresh_expires_at: Math.floor(Date.now() / 1000) + tokenPair.refreshExpiresIn,
        user: {
          id: agent.id,
          email: agent.email || agent.username,
          user_metadata: {
            username: agent.username,
            full_name: agent.full_name,
            role: agent.role
          }
        }
      };

      // Actualizar último login
      try {
        await supabaseAdmin
          .from('agents')
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id);
      } catch (updateError) {
        logger.warn('Error actualizando último login', { error: updateError });
        // Continuar aunque falle la actualización
      }

      logger.info(`Usuario autenticado exitosamente: ${loginData.username}`);
      return { user: profileData, session };
    } catch (error) {
      logger.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        logger.error('Error fetching user by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getUserById:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por email
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        logger.error('Error fetching user by email:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getUserByEmail:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil de usuario
   */
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { data, error } = await supabaseAdmin
        .from('agents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user profile:', error);
        throw error;
      }

      logger.info(`User profile updated: ${userId}`);
      return data;
    } catch (error) {
      logger.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  /**
   * Desactivar usuario
   */
  static async deactivateUser(userId: string): Promise<void> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { error } = await supabaseAdmin
        .from('agents')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Error deactivating user:', error);
        throw error;
      }

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      logger.error('Error in deactivateUser:', error);
      throw error;
    }
  }

  /**
   * Verificar permisos de usuario
   */
  static async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      // Lógica de permisos basada en roles
      switch (user.role) {
        case 'admin':
          return true; // Admin tiene todos los permisos
        case 'supervisor':
          return ['conversations', 'messages', 'contacts', 'agents'].includes(resource);
        case 'agent':
          return ['conversations', 'messages'].includes(resource) && action !== 'delete';
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Obtener rol del usuario actual
   */
  static async getCurrentUserRole(userId: string): Promise<string> {
    try {
      const user = await this.getUserById(userId);
      return user?.role || 'agent';
    } catch (error) {
      logger.error('Error getting user role:', error);
      return 'agent';
    }
  }

  /**
   * Crear administrador inicial (si no existe)
   */
  static async createInitialAdmin(): Promise<UserProfile> {
    try {
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';

      // Verificar si ya existe un admin
      const existingAdmin = await this.getUserByEmail(adminEmail);
      if (existingAdmin) {
        logger.info('Initial admin already exists');
        return existingAdmin;
      }

      // Validar que la contraseña del admin sea segura
      const passwordValidation = PasswordUtils.validatePasswordStrength(adminPassword);
      if (!passwordValidation.isValid) {
        logger.warn(`Contraseña inicial del admin débil: ${passwordValidation.message}`);
      }

      // Crear admin inicial
      const adminData: CreateUserData = {
        username: 'admin',
        full_name: 'Administrador del Sistema',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      };

      const admin = await this.createUser(adminData);
      logger.info('Initial admin created successfully');
      return admin;
    } catch (error) {
      logger.error('Error creating initial admin:', error);
      throw error;
    }
  }
} 