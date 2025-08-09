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
const password_utils_1 = require("../utils/password.utils");
const token_service_1 = require("./token.service");
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
                // Hashear la contraseña antes de guardarla
                const hashedPassword = yield password_utils_1.PasswordUtils.hashPassword(userData.password);
                const { data: profileData, error: profileError } = yield supabase_1.supabaseAdmin
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
     * Autenticar usuario validando directamente contra tabla agents
     */
    static login(loginData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    throw new Error('Servicio de autenticación no disponible');
                }
                // MODO SIMPLE: Coincidencia exacta username/password en tabla agents (opcional)
                const isExactMatchMode = (process.env.AUTH_EXACT_MATCH || '').toLowerCase() === 'true';
                if (isExactMatchMode) {
                    const { data: agentExact, error: agentExactError } = yield supabase_1.supabaseAdmin
                        .from('agents')
                        .select('*')
                        .eq('username', loginData.username)
                        .eq('password', loginData.password)
                        .eq('is_active', true)
                        .single();
                    if (agentExactError || !agentExact) {
                        logger_1.logger.warn('Login exact match falló', { username: loginData.username, error: (agentExactError === null || agentExactError === void 0 ? void 0 : agentExactError.message) || 'no match' });
                        throw new Error('Usuario o contraseña incorrectos');
                    }
                    const profileData = {
                        id: agentExact.id,
                        username: agentExact.username,
                        full_name: agentExact.full_name || agentExact.username,
                        email: agentExact.email || `${agentExact.username}@local`,
                        role: agentExact.role || 'agent',
                        whatsapp_id: agentExact.whatsapp_id,
                        is_active: agentExact.is_active,
                        created_at: agentExact.created_at,
                        updated_at: agentExact.updated_at
                    };
                    const tokenPair = yield token_service_1.TokenService.generateTokenPair({
                        sub: agentExact.id,
                        email: agentExact.email || agentExact.username,
                        role: agentExact.role,
                        username: agentExact.username
                    });
                    const session = {
                        access_token: tokenPair.accessToken,
                        refresh_token: tokenPair.refreshToken,
                        token_type: 'bearer',
                        expires_in: tokenPair.expiresIn,
                        expires_at: Math.floor(Date.now() / 1000) + tokenPair.expiresIn,
                        refresh_expires_in: tokenPair.refreshExpiresIn,
                        refresh_expires_at: Math.floor(Date.now() / 1000) + tokenPair.refreshExpiresIn,
                        user: {
                            id: agentExact.id,
                            email: agentExact.email || agentExact.username,
                            user_metadata: {
                                username: agentExact.username,
                                full_name: agentExact.full_name,
                                role: agentExact.role
                            }
                        }
                    };
                    logger_1.logger.info('Login exitoso (exact match)', { username: loginData.username });
                    return { user: profileData, session };
                }
                // Buscar usuario por username en tabla agents
                const { data: agent, error: agentError } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .eq('username', loginData.username)
                    .single();
                if (agentError || !agent) {
                    logger_1.logger.error(`Usuario no encontrado: ${loginData.username}`);
                    throw new Error('Usuario o contraseña incorrectos');
                }
                // Verificar contraseña usando bcrypt
                let isPasswordValid = false;
                // Verificar si la contraseña está hasheada o en texto plano (para migración)
                if (password_utils_1.PasswordUtils.isPasswordHashed(agent.password)) {
                    // Si está hasheada, usar bcrypt.compare
                    isPasswordValid = yield password_utils_1.PasswordUtils.verifyPassword(loginData.password, agent.password);
                }
                else {
                    // Si está en texto plano, comparar directamente (solo durante migración)
                    isPasswordValid = agent.password === loginData.password;
                    // Log para identificar usuarios que necesitan migración
                    logger_1.logger.warn(`Usuario ${loginData.username} tiene contraseña en texto plano - necesita migración`);
                }
                if (!isPasswordValid) {
                    logger_1.logger.error(`Contraseña incorrecta para usuario: ${loginData.username}`);
                    throw new Error('Usuario o contraseña incorrectos');
                }
                // Verificar si el usuario está activo
                if (!agent.is_active) {
                    logger_1.logger.warn(`Usuario inactivo intentando acceder: ${loginData.username}`);
                    throw new Error('Usuario inactivo');
                }
                // Crear perfil de usuario para retornar
                const profileData = {
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
                const tokenPair = yield token_service_1.TokenService.generateTokenPair({
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
                    yield supabase_1.supabaseAdmin
                        .from('agents')
                        .update({
                        last_login: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', agent.id);
                }
                catch (updateError) {
                    logger_1.logger.warn('Error actualizando último login', { error: updateError });
                    // Continuar aunque falle la actualización
                }
                logger_1.logger.info(`Usuario autenticado exitosamente: ${loginData.username}`);
                return { user: profileData, session };
            }
            catch (error) {
                logger_1.logger.error('Error en login:', error);
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
                // Validar que la contraseña del admin sea segura
                const passwordValidation = password_utils_1.PasswordUtils.validatePasswordStrength(adminPassword);
                if (!passwordValidation.isValid) {
                    logger_1.logger.warn(`Contraseña inicial del admin débil: ${passwordValidation.message}`);
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
