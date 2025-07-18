"use strict";
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
exports.AuthService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class AuthService {
    /**
     * Crear un nuevo usuario
     */
    static createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                // Crear usuario en Supabase Auth usando el cliente administrativo
                const { data: authData, error: authError } = yield supabase_1.supabaseAdmin.auth.admin.createUser({
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
                    logger_1.logger.error('Error creating auth user:', authError);
                    throw new Error(`Error creating user: ${authError.message}`);
                }
                if (!authData.user) {
                    throw new Error('No user data returned from auth creation');
                }
                // Crear perfil de usuario en la tabla user_profiles usando el cliente administrativo
                const { data: profileData, error: profileError } = yield supabase_1.supabaseAdmin
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
                    logger_1.logger.error('Error creating user profile:', profileError);
                    throw new Error(`Error creating user profile: ${profileError.message}`);
                }
                logger_1.logger.info(`User created successfully: ${userData.email}`);
                return profileData;
            }
            catch (error) {
                logger_1.logger.error('Error in createUser:', error);
                throw error;
            }
        });
    }
    /**
     * Autenticar usuario
     */
    static login(loginData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase || !supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                // Buscar el usuario por email usando el cliente administrativo
                const { data: profileData, error: profileError } = yield supabase_1.supabaseAdmin
                    .from('user_profiles')
                    .select('*')
                    .eq('email', loginData.email)
                    .single();
                if (profileError || !profileData) {
                    logger_1.logger.error('User not found:', profileError);
                    throw new Error('Usuario o contraseña incorrectos');
                }
                if (!profileData.is_active) {
                    throw new Error('Cuenta de usuario desactivada');
                }
                // Autenticar con Supabase usando el email directamente
                const { data, error } = yield supabase_1.supabase.auth.signInWithPassword({
                    email: loginData.email,
                    password: loginData.password
                });
                if (error) {
                    logger_1.logger.error('Login error:', error);
                    throw new Error(`Error de autenticación: ${error.message}`);
                }
                if (!data.user) {
                    throw new Error('No se obtuvo información del usuario');
                }
                // Actualizar último login usando el cliente administrativo
                yield supabase_1.supabaseAdmin
                    .from('user_profiles')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', data.user.id);
                logger_1.logger.info(`User logged in successfully: ${loginData.email}`);
                return { user: profileData, session: data.session };
            }
            catch (error) {
                logger_1.logger.error('Error in login:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener usuario por ID
     */
    static getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (error) {
                    logger_1.logger.error('Error fetching user by ID:', error);
                    return null;
                }
                return data;
            }
            catch (error) {
                logger_1.logger.error('Error in getUserById:', error);
                return null;
            }
        });
    }
    /**
     * Obtener usuario por email
     */
    static getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('email', email)
                    .single();
                if (error) {
                    logger_1.logger.error('Error fetching user by email:', error);
                    return null;
                }
                return data;
            }
            catch (error) {
                logger_1.logger.error('Error in getUserByEmail:', error);
                return null;
            }
        });
    }
    /**
     * Obtener todos los usuarios (solo para admins)
     */
    static getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('user_profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) {
                    logger_1.logger.error('Error fetching all users:', error);
                    throw new Error(`Error fetching users: ${error.message}`);
                }
                return data || [];
            }
            catch (error) {
                logger_1.logger.error('Error in getAllUsers:', error);
                throw error;
            }
        });
    }
    /**
     * Actualizar perfil de usuario
     */
    static updateUserProfile(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('user_profiles')
                    .update(Object.assign(Object.assign({}, updates), { updated_at: new Date().toISOString() }))
                    .eq('id', userId)
                    .select()
                    .single();
                if (error) {
                    logger_1.logger.error('Error updating user profile:', error);
                    throw new Error(`Error updating user profile: ${error.message}`);
                }
                logger_1.logger.info(`User profile updated: ${userId}`);
                return data;
            }
            catch (error) {
                logger_1.logger.error('Error in updateUserProfile:', error);
                throw error;
            }
        });
    }
    /**
     * Desactivar usuario
     */
    static deactivateUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { error } = yield supabase_1.supabase
                    .from('user_profiles')
                    .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', userId);
                if (error) {
                    logger_1.logger.error('Error deactivating user:', error);
                    throw new Error(`Error deactivating user: ${error.message}`);
                }
                logger_1.logger.info(`User deactivated: ${userId}`);
            }
            catch (error) {
                logger_1.logger.error('Error in deactivateUser:', error);
                throw error;
            }
        });
    }
    /**
     * Verificar si un usuario tiene un permiso específico
     */
    static hasPermission(userId, resource, action) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { data, error } = yield supabase_1.supabase
                    .rpc('has_permission', {
                    p_resource: resource,
                    p_action: action
                });
                if (error) {
                    logger_1.logger.error('Error checking permission:', error);
                    return false;
                }
                return data || false;
            }
            catch (error) {
                logger_1.logger.error('Error in hasPermission:', error);
                return false;
            }
        });
    }
    /**
     * Obtener rol del usuario actual
     */
    static getCurrentUserRole(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                const { data, error } = yield supabase_1.supabase
                    .rpc('get_current_user_role');
                if (error) {
                    logger_1.logger.error('Error getting user role:', error);
                    return 'user';
                }
                return data || 'user';
            }
            catch (error) {
                logger_1.logger.error('Error in getCurrentUserRole:', error);
                return 'user';
            }
        });
    }
    /**
     * Crear usuario admin inicial
     */
    static createInitialAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                // Verificar si ya existe un admin
                const { data: existingAdmin } = yield supabase_1.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('role', 'admin')
                    .single();
                if (existingAdmin) {
                    logger_1.logger.info('Admin user already exists');
                    return existingAdmin;
                }
                // Crear admin inicial
                const adminData = {
                    username: 'admin',
                    full_name: 'Administrador del Sistema',
                    email: 'admin@embler.mx',
                    password: 'Admin2024!', // Cambiar en producción
                    role: 'admin',
                    whatsapp_id: 'WHATSAPP_ADMIN_ID' // Se actualizará con el ID real
                };
                const admin = yield this.createUser(adminData);
                logger_1.logger.info('Initial admin user created successfully');
                return admin;
            }
            catch (error) {
                logger_1.logger.error('Error creating initial admin:', error);
                throw error;
            }
        });
    }
}
exports.AuthService = AuthService;
