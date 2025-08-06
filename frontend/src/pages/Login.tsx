import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { MessageCircle, Shield, Zap, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, RefreshCw, Bug, Trash2 } from "lucide-react";
import Logo from "../components/LogoDebug";
import { forceLogout } from "../utils/auth-cleanup";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { state, login, clearError } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    console.log('🔍 [Login] Estado de autenticación:', {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      isLoading: state.isLoading
    });
    
    if (state.isAuthenticated && state.user) {
      console.log('✅ [Login] Usuario autenticado, redirigiendo...');
      // La redirección se manejará automáticamente por RoleRedirect
      navigate("/", { replace: true });
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // Limpiar errores al cambiar inputs
  useEffect(() => {
    if (state.error) {
      clearError();
    }
  }, [email, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 [Login] Iniciando submit con credenciales:', { email: email.trim(), password: password ? '***' : 'vacía' });
    
    if (!email.trim() || !password.trim()) {
      console.warn('⚠️ [Login] Credenciales incompletas');
      return;
    }

    try {
      console.log('🔍 [Login] Llamando a login...');
      await login({ email: email.trim(), password, rememberMe: remember });
      console.log('✅ [Login] Login completado exitosamente');
      // La navegación se manejará automáticamente por el useEffect
    } catch (error) {
      // El error se maneja en el contexto
      console.error('❌ [Login] Error en login:', error);
    }
  };

  const handleClearSession = () => {
    forceLogout();
  };

  // Credenciales demo disponibles
  const demoCredentials = [
    {
      name: "Administrador",
      email: "moises.s@aova.mx",
      password: "Admin2024!",
      role: "admin",
      description: "Acceso completo al sistema"
    },
    {
      name: "Agente 1",
      email: "k.alvarado@aova.mx",
      password: "Agente2024!",
      role: "agent",
      description: "Gestión de conversaciones"
    },
    {
      name: "Agente 2",
      email: "elisa.n@synaracare.com",
      password: "Agente2024!",
      role: "agent",
      description: "Gestión de conversaciones"
    }
  ];

  const handleDemoLogin = (credentials: typeof demoCredentials[0]) => {
    setEmail(credentials.email);
    setPassword(credentials.password);
    setRemember(true);
  };

  // Función para debug de sesión
  const debugSession = () => {
    const token = localStorage.getItem('authToken');
    console.log('🔍 [Debug] Token actual:', token ? token.substring(0, 30) + '...' : 'No hay token');
    console.log('🔍 [Debug] Remember auth:', localStorage.getItem('rememberAuth'));
    console.log('🔍 [Debug] User data:', localStorage.getItem('userData'));
  };

  // Función para limpiar sesión sin redirigir
  const clearSessionOnly = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberAuth');
    localStorage.removeItem('userData');
    sessionStorage.clear();
    console.log('🧹 [Debug] Sesión limpiada (sin redirigir)');
    window.location.reload();
  };

  const features = [
    {
      icon: MessageCircle,
      title: "Chat en Tiempo Real",
      description: "Gestiona conversaciones de WhatsApp Business de forma profesional",
      gradient: "primary" as const
    },
    {
      icon: Zap,
      title: "IA Integrada",
      description: "Chatbot inteligente para respuestas automáticas y recopilación de datos",
      gradient: "secondary" as const
    },
    {
      icon: Shield,
      title: "API Oficial Meta",
      description: "100% compatible con las políticas de WhatsApp Business",
      gradient: "accent" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark particles-bg flex relative overflow-hidden">
      {/* Elementos decorativos animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-yellow rounded-full opacity-10"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-gold rounded-full opacity-10"
          animate={{ 
            y: [0, 20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-gray rounded-full opacity-5"
          animate={{ 
            rotate: [0, -180, -360],
            scale: [1, 0.8, 1]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>

      {/* Header */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Logo size="lg" />
        <motion.div 
          className="text-gray-400 text-sm"
          whileHover={{ scale: 1.05 }}
        >
          ¿Necesitas ayuda? <span className="text-embler-yellow hover:text-embler-yellowLight hover:underline cursor-pointer">Contacta soporte</span>
        </motion.div>
      </motion.div>

      {/* Panel Izquierdo */}
      <motion.div 
        className="flex-1 relative flex flex-col justify-center p-12 lg:p-20"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <div className="relative z-10 max-w-lg">
          <motion.h1 
            className="text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Bienvenido de Nuevo
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-300 mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Inicia sesión para acceder a tu plataforma de gestión de WhatsApp Business y comenzar a atender a tus clientes.
          </motion.p>
          
          <div className="space-y-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="flex items-start space-x-4"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.2 }}
                whileHover={{ x: 10 }}
              >
                <motion.div 
                  className="flex-shrink-0 w-14 h-14 bg-embler-yellow rounded-2xl flex items-center justify-center shadow-glow"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <feature.icon className="w-7 h-7 text-black" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Panel Derecho */}
      <motion.div 
        className="w-full max-w-md bg-glass-dark backdrop-blur-xl flex flex-col justify-center p-8 border-l border-white/10"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
      >
        <div className="w-full max-w-sm mx-auto">
          <motion.h2 
            className="text-4xl font-bold text-white mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Iniciar Sesión
          </motion.h2>
          
          {/* Credenciales demo */}
          <motion.div 
            className="mb-6 space-y-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-embler-yellow" />
              <span className="text-embler-yellow text-sm font-medium">Credenciales Demo</span>
            </div>
            
            {demoCredentials.map((credential, index) => (
              <motion.button
                key={credential.email}
                className="w-full p-3 bg-embler-yellow/10 border border-embler-yellow/30 rounded-xl backdrop-blur-sm hover:bg-embler-yellow/20 transition-all text-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDemoLogin(credential)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      credential.role === 'admin' ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <span className="text-white text-sm font-medium">{credential.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    credential.role === 'admin' 
                      ? 'bg-red-500/20 text-red-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {credential.role === 'admin' ? 'Admin' : 'Agente'}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* Error de autenticación */}
          <AnimatePresence>
            {state.error && (
              <motion.div 
                className="mb-6 p-4 bg-embler-yellow/20 border border-embler-yellow/30 rounded-xl backdrop-blur-sm"
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-embler-yellow rounded-full animate-pulse" />
                  <span className="text-embler-yellow text-sm">{state.error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 pl-12 bg-embler-gray border border-embler-grayLight rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow/50 focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="tu@email.com"
                  required
                  disabled={state.isLoading}
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <motion.a 
                  href="#" 
                  className="text-sm text-embler-yellow hover:text-embler-yellowLight hover:underline"
                  whileHover={{ scale: 1.05 }}
                >
                  ¿Olvidaste tu contraseña?
                </motion.a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 pl-12 pr-12 bg-embler-gray border border-embler-grayLight rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow/50 focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                  disabled={state.isLoading}
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 text-embler-yellow focus:ring-embler-yellow border-embler-grayLight rounded bg-embler-gray"
                disabled={state.isLoading}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                Recuérdame por 30 días
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={state.isLoading || !email.trim() || !password.trim()}
              className="w-full py-4 px-6 bg-embler-yellow text-black font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-embler-yellow focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg hover:bg-embler-yellowLight"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {state.isLoading ? (
                <>
                  <motion.div 
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            {/* Botón para limpiar sesión */}
            <motion.button
              type="button"
              onClick={handleClearSession}
              className="w-full py-3 px-6 bg-transparent border border-gray-600 text-gray-300 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-transparent hover:bg-gray-800 hover:border-gray-500 flex items-center justify-center gap-3 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpiar Sesión</span>
            </motion.button>

            {/* Botón de debug */}
            <motion.button
              type="button"
              onClick={debugSession}
              className="w-full py-3 px-6 bg-gray-800 text-gray-300 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-transparent hover:bg-gray-700 flex items-center justify-center gap-3 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Bug className="w-4 h-4" />
              <span>Debug Sesión</span>
            </motion.button>

            {/* Botón para limpiar sesión sin redirigir */}
            <motion.button
              type="button"
              onClick={clearSessionOnly}
              className="w-full py-3 px-6 bg-red-600 text-white font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent hover:bg-red-700 flex items-center justify-center gap-3 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpiar Sesión (Sin Redirigir)</span>
            </motion.button>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login; 