import { supabase, supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

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
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('agents')
        .insert({
          id: authData.user.id,
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role || 'agent',
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
   * Autenticar usuario (versión simplificada y menos restrictiva)
   */
  static async login(loginData: LoginData): Promise<{ user: UserProfile; session: any }> {
    try {
      if (!supabase || !supabaseAdmin) {
        throw new Error('Servicio de autenticación no disponible');
      }

      // Primero intentar autenticar con Supabase Auth (más rápido)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (authError) {
        logger.error('Error authenticating user:', authError);
        throw new Error(`Error de autenticación: ${authError.message}`);
      }

      if (!authData.user || !authData.session) {
        throw new Error('No se pudo autenticar al usuario');
      }

      // Buscar el perfil del usuario (más flexible)
      let profileData: UserProfile;
      
      try {
        const { data: profileResult, error: profileError } = await supabaseAdmin
          .from('agents')
          .select('*')
          .eq('email', loginData.email)
          .single();

        if (profileError) {
          logger.warn('Error fetching user profile, creating basic profile');
          // Si no existe el perfil, crear uno básico
          profileData = {
            id: authData.user.id,
            username: authData.user.user_metadata?.username || authData.user.email?.split('@')[0] || 'user',
            full_name: authData.user.user_metadata?.full_name || authData.user.email || 'Usuario',
            email: authData.user.email || '',
            role: authData.user.user_metadata?.role || 'agent',
            whatsapp_id: authData.user.user_metadata?.whatsapp_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          profileData = profileResult;
          
          // Si el usuario está marcado como inactivo, reactivarlo automáticamente
          if (!profileData.is_active) {
            logger.info('Reactivating inactive user');
            profileData.is_active = true;
            profileData.updated_at = new Date().toISOString();
          }
        }
      } catch (profileError) {
        logger.warn('Error with user profile, using auth data');
        // Crear perfil básico si hay problemas
        profileData = {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || authData.user.email?.split('@')[0] || 'user',
          full_name: authData.user.user_metadata?.full_name || authData.user.email || 'Usuario',
          email: authData.user.email || '',
          role: authData.user.user_metadata?.role || 'agent',
          whatsapp_id: authData.user.user_metadata?.whatsapp_id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Actualizar último login y estado activo
      try {
        await supabaseAdmin
          .from('agents')
          .upsert({
            id: profileData.id,
            username: profileData.username,
            full_name: profileData.full_name,
            email: profileData.email,
            role: profileData.role,
            whatsapp_id: profileData.whatsapp_id,
            is_active: true,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
      } catch (updateError) {
        logger.warn('Error updating user profile');
        // Continuar aunque falle la actualización
      }

      logger.info(`User logged in successfully: ${loginData.email}`);
      return { user: profileData, session: authData.session };
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