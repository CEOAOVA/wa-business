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
                        role: userData.role || 'agent'
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
                // Crear perfil de usuario en la tabla agents usando el cliente administrativo
                const { data: profileData, error: profileError } = yield supabase_1.supabaseAdmin
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
                    .from('agents')
                    .select('*')
                    .eq('email', loginData.email)
                    .eq('is_active', true)
                    .single();
                if (profileError) {
                    logger_1.logger.error('Error fetching user profile:', profileError);
                    throw new Error('Usuario no encontrado o inactivo');
                }
                if (!profileData) {
                    throw new Error('Usuario no encontrado');
                }
                // Autenticar con Supabase Auth
                const { data: authData, error: authError } = yield supabase_1.supabase.auth.signInWithPassword({
                    email: loginData.email,
                    password: loginData.password
                });
                if (authError) {
                    logger_1.logger.error('Error authenticating user:', authError);
                    throw new Error(`Error de autenticación: ${authError.message}`);
                }
                if (!authData.user || !authData.session) {
                    throw new Error('No se pudo autenticar al usuario');
                }
                // Actualizar último login
                yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update({
                    last_login: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .eq('id', profileData.id);
                logger_1.logger.info(`User logged in successfully: ${loginData.email}`);
                return { user: profileData, session: authData.session };
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
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .eq('id', userId)
                    .eq('is_active', true)
                    .single();
                if (error) {
                    if (error.code === 'PGRST116') {
                        return null; // No encontrado
                    }
                    logger_1.logger.error('Error fetching user by ID:', error);
                    throw error;
                }
                return data;
            }
            catch (error) {
                logger_1.logger.error('Error in getUserById:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener usuario por email
     */
    static getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .eq('email', email)
                    .eq('is_active', true)
                    .single();
                if (error) {
                    if (error.code === 'PGRST116') {
                        return null; // No encontrado
                    }
                    logger_1.logger.error('Error fetching user by email:', error);
                    throw error;
                }
                return data;
            }
            catch (error) {
                logger_1.logger.error('Error in getUserByEmail:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener todos los usuarios
     */
    static getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                if (error) {
                    logger_1.logger.error('Error fetching all users:', error);
                    throw error;
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
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update(Object.assign(Object.assign({}, updates), { updated_at: new Date().toISOString() }))
                    .eq('id', userId)
                    .select()
                    .single();
                if (error) {
                    logger_1.logger.error('Error updating user profile:', error);
                    throw error;
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
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación administrativa no disponible');
                }
                const { error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', userId);
                if (error) {
                    logger_1.logger.error('Error deactivating user:', error);
                    throw error;
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
     * Verificar permisos de usuario
     */
    static hasPermission(userId, resource, action) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getUserById(userId);
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
            }
            catch (error) {
                logger_1.logger.error('Error checking permissions:', error);
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
                const user = yield this.getUserById(userId);
                return (user === null || user === void 0 ? void 0 : user.role) || 'agent';
            }
            catch (error) {
                logger_1.logger.error('Error getting user role:', error);
                return 'agent';
            }
        });
    }
    /**
     * Crear administrador inicial (si no existe)
     */
    static createInitialAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';
                const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
                // Verificar si ya existe un admin
                const existingAdmin = yield this.getUserByEmail(adminEmail);
                if (existingAdmin) {
                    logger_1.logger.info('Initial admin already exists');
                    return existingAdmin;
                }
                // Crear admin inicial
                const adminData = {
                    username: 'admin',
                    full_name: 'Administrador del Sistema',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin'
                };
                const admin = yield this.createUser(adminData);
                logger_1.logger.info('Initial admin created successfully');
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
