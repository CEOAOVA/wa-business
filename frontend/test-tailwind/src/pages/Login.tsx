import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { state, login, clearError } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate("/chats", { replace: true });
    }
  }, [state.isAuthenticated, navigate]);

  // Limpiar errores al cambiar inputs
  useEffect(() => {
    if (state.error) {
      clearError();
    }
  }, [email, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      return;
    }

    try {
      await login({ email: email.trim(), password, rememberMe: remember });
      // La navegación se manejará automáticamente por el useEffect
    } catch (error) {
      // El error se maneja en el contexto
      console.error('Error en login:', error);
    }
  };

  const handleDemoLogin = () => {
    setEmail("admin@embler.com");
    setPassword("admin123");
    setRemember(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-embler-yellow">EMBLER</span>
          <span className="text-gray-400 text-sm ml-2">by AOVA</span>
        </div>
        <div className="text-gray-400 text-sm">
          ¿Necesitas ayuda? <span className="text-embler-yellow hover:underline cursor-pointer">Contacta soporte</span>
        </div>
      </div>

      {/* Panel Izquierdo */}
      <div className="flex-1 relative flex flex-col justify-center p-12 lg:p-20">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 border-2 border-embler-yellow rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 border border-embler-yellow rounded-full animate-pulse"></div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white mb-6">Bienvenido de Nuevo</h1>
          <p className="text-xl text-gray-300 mb-12">
            Inicia sesión para acceder a tu plataforma de gestión de WhatsApp Business y comenzar a atender a tus clientes.
          </p>
          
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-embler-yellow rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-embler-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Chat en Tiempo Real</h3>
                <p className="text-gray-400">Gestiona conversaciones de WhatsApp Business de forma profesional</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-embler-yellow rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-embler-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">IA Integrada</h3>
                <p className="text-gray-400">Chatbot inteligente para respuestas automáticas y recopilación de datos</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-embler-yellow rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-embler-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">API Oficial Meta</h3>
                <p className="text-gray-400">100% compatible con las políticas de WhatsApp Business</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho */}
      <div className="w-full max-w-md bg-embler-gray flex flex-col justify-center p-8">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">Iniciar Sesión</h2>
          
          {/* Mensaje de demo */}
          <div className="mb-6 p-4 bg-embler-yellow bg-opacity-20 border border-embler-yellow border-opacity-30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-embler-yellow" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-embler-yellow text-sm font-medium">Demo</span>
            </div>
            <p className="text-embler-yellow text-sm">
              Email: <code className="bg-embler-dark/50 px-1 rounded">admin@embler.com</code><br />
              Contraseña: <code className="bg-embler-dark/50 px-1 rounded">admin123</code>
            </p>
            <button
              onClick={handleDemoLogin}
              className="mt-2 text-embler-yellow hover:underline text-sm font-medium"
            >
              → Usar credenciales demo
            </button>
          </div>

          {/* Error de autenticación */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-400 text-sm">{state.error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-embler-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  required
                  disabled={state.isLoading}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <a href="#" className="text-sm text-embler-yellow hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 bg-embler-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  disabled={state.isLoading}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 text-embler-yellow focus:ring-embler-yellow border-gray-600 rounded bg-embler-dark"
                disabled={state.isLoading}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                Recuérdame por 30 días
              </label>
            </div>

            <button
              type="submit"
              disabled={state.isLoading || !email.trim() || !password.trim()}
              className="w-full py-3 px-4 bg-embler-yellow hover:bg-embler-yellow/80 text-embler-dark font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-embler-yellow focus:ring-offset-2 focus:ring-offset-embler-gray disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {state.isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-embler-dark border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿No tienes una cuenta?{" "}
              <a href="#" className="text-embler-yellow hover:underline font-medium">
                Solicitar acceso
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-gray-500">
            © 2024 Embler by AOVA. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Versión 2.0 • Powered by WhatsApp Business API
          </p>
        </div>
      </div>

      {/* Botón de simulación de cliente */}
      <button
        onClick={() => navigate('/client-chat')}
        className="fixed bottom-6 left-6 z-20 bg-embler-yellow hover:bg-embler-yellow/80 text-embler-dark p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group"
        title="Simular experiencia del cliente"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-embler-dark text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Simular Cliente
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-embler-dark"></div>
        </div>
      </button>
    </div>
  );
};

export default Login; 