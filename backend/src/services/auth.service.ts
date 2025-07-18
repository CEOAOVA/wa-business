import { supabase, supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
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
  role?: 'admin' | 'agent' | 'user';
  whatsapp_id?: string;
}

export interface LoginData {
  email: string;
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
          role: userData.role || 'user'
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

      // Crear perfil de usuario en la tabla user_profiles usando el cliente administrativo
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role || 'user',
          whatsapp_id: userData.whatsapp_id,
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
   * Autenticar usuario
   */
  static async login(loginData: LoginData): Promise<{ user: UserProfile; session: any }> {
    try {
      if (!supabase || !supabaseAdmin) {
        throw new Error('Servicio de autenticación no disponible');
      }

      // Buscar el usuario por email usando el cliente administrativo
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', loginData.email)
        .single();

      if (profileError || !profileData) {
        logger.error('User not found:', profileError);
        throw new Error('Usuario o contraseña incorrectos');
      }

      if (!profileData.is_active) {
        throw new Error('Cuenta de usuario desactivada');
      }

      // Autenticar con Supabase usando el email directamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) {
        logger.error('Login error:', error);
        throw new Error(`Error de autenticación: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('No se obtuvo información del usuario');
      }

      // Actualizar último login usando el cliente administrativo
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      logger.info(`User logged in successfully: ${loginData.email}`);
      return { user: profileData, session: data.session };
    } catch (error) {
      logger.error('Error in login:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('Error fetching user by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error in getUserById:', error);
      return null;
    }
  }

  /**
   * Obtener usuario por email
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        logger.error('Error fetching user by email:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error in getUserByEmail:', error);
      return null;
    }
  }

  /**
   * Obtener todos los usuarios (solo para admins)
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Servicio de autenticación administrativa no disponible');
      }

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all users:', error);
        throw new Error(`Error fetching users: ${error.message}`);
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
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user profile:', error);
        throw new Error(`Error updating user profile: ${error.message}`);
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
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Error deactivating user:', error);
        throw new Error(`Error deactivating user: ${error.message}`);
      }

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      logger.error('Error in deactivateUser:', error);
      throw error;
    }
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  static async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { data, error } = await supabase
        .rpc('has_permission', {
          p_resource: resource,
          p_action: action
        });

      if (error) {
        logger.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      logger.error('Error in hasPermission:', error);
      return false;
    }
  }

  /**
   * Obtener rol del usuario actual
   */
  static async getCurrentUserRole(userId: string): Promise<string> {
    try {
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      const { data, error } = await supabase
        .rpc('get_current_user_role');

      if (error) {
        logger.error('Error getting user role:', error);
        return 'user';
      }

      return data || 'user';
    } catch (error) {
      logger.error('Error in getCurrentUserRole:', error);
      return 'user';
    }
  }

  /**
   * Crear usuario admin inicial
   */
  static async createInitialAdmin(): Promise<UserProfile> {
    try {
      if (!supabase) {
        throw new Error('Servicio de autenticación no disponible');
      }

      // Verificar si ya existe un admin
      const { data: existingAdmin } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'admin')
        .single();

      if (existingAdmin) {
        logger.info('Admin user already exists');
        return existingAdmin;
      }

      // Crear admin inicial
      const adminData: CreateUserData = {
        username: 'admin',
        full_name: 'Administrador del Sistema',
        email: 'admin@embler.mx',
        password: 'Admin2024!', // Cambiar en producción
        role: 'admin',
        whatsapp_id: 'WHATSAPP_ADMIN_ID' // Se actualizará con el ID real
      };

      const admin = await this.createUser(adminData);
      logger.info('Initial admin user created successfully');
      return admin;
    } catch (error) {
      logger.error('Error creating initial admin:', error);
      throw error;
    }
  }
} 