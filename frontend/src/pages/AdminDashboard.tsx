import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  ShoppingCart, 
  MessageCircle, 
  Activity, 
  TrendingUp, 
  Database,
  Server,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Wifi,
  WifiOff,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApiService } from '../services/dashboard-api';
import { authApiService } from '../services/auth-api';
import Logo from '../components/LogoDebug';

// Interfaz local para el dashboard con datos formateados
interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    agents: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  conversations: {
    total: number;
    active: number;
    closed: number;
    unread: number;
  };
  system: {
    uptime: string;
    memory: string;
    database: string;
    lastBackup: string;
  };
}

const AdminDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [clearSessionsLoading, setClearSessionsLoading] = useState(false);

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (state.user && state.user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [state.user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener estadísticas reales del sistema
      const realStats = await dashboardApiService.getStats();
      
      // Formatear datos para la interfaz
      const formattedStats: DashboardStats = {
        ...realStats,
        system: {
          ...realStats.system,
          uptime: dashboardApiService.formatUptime(realStats.system.uptime),
          memory: dashboardApiService.formatMemoryPercentage(
            realStats.system.memory.heapUsed, 
            realStats.system.memory.heapTotal
          ),
        }
      };

      setStats(formattedStats);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Cerrar menú de usuario cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showUserMenu && !target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      // El logout redirigirá automáticamente al login
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Error al cerrar sesión');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleClearSessions = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar todas las sesiones del servidor? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setClearSessionsLoading(true);
      const result = await authApiService.clearSessions();
      alert(`✅ Sesiones limpiadas exitosamente\nServicios limpiados: ${result.cleanedServices.join(', ')}`);
      // Recargar estadísticas después de limpiar
      await fetchStats();
    } catch (error) {
      console.error('Error clearing sessions:', error);
      alert('❌ Error al limpiar sesiones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setClearSessionsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue', 
    subtitle = '',
    trend = null 
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color?: string;
    subtitle?: string;
    trend?: { value: number; isPositive: boolean } | null;
  }) => (
    <motion.div
      className={`bg-glass-dark backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300`}
      whileHover={{ scale: 1.02, y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/20 border border-${color}-500/30`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
            {trend.value}%
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
      
      {subtitle && (
        <p className="text-gray-500 text-xs">{subtitle}</p>
      )}
    </motion.div>
  );

  const StatusIndicator = ({ status, label }: { status: 'online' | 'warning' | 'error'; label: string }) => {
    const colors = {
      online: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400'
    };
    
    const icons = {
      online: CheckCircle,
      warning: AlertCircle,
      error: XCircle
    };
    
    const Icon = icons[status];
    
    return (
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 ${colors[status]}`} />
        <span className="text-gray-300 text-sm">{label}</span>
      </div>
    );
  };

  if (!state.user || state.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-400">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <motion.header 
        className="bg-glass-dark backdrop-blur-xl border-b border-white/10 p-6 relative z-[9997]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Logo size="md" />
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-gray-400">Bienvenido, {state.user.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Indicador de Conexión */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? 'En línea' : 'Sin conexión'}
              </span>
            </div>

            <div className="text-right">
              <p className="text-gray-400 text-sm">Última actualización</p>
              <p className="text-white text-sm">{lastUpdate.toLocaleTimeString()}</p>
            </div>
            
            <motion.button
              onClick={fetchStats}
              disabled={loading}
              className="p-3 bg-embler-yellow/20 border border-embler-yellow/30 rounded-xl hover:bg-embler-yellow/30 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={`w-5 h-5 text-embler-yellow ${loading ? 'animate-spin' : ''}`} />
            </motion.button>

            {/* Menú de Usuario */}
            <div className="relative user-menu z-[9998]">
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-8 h-8 bg-embler-yellow/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-embler-yellow" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{state.user?.name}</p>
                  <p className="text-gray-400 text-xs">Administrador</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </motion.button>

              {/* Menú Desplegable */}
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-black border border-white/10 rounded-xl shadow-xl z-[9999]"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-embler-yellow/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-embler-yellow" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{state.user?.name}</p>
                        <p className="text-gray-400 text-sm">{state.user?.email}</p>
                        <p className="text-embler-yellow text-xs font-medium">Administrador</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configuración</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <LogOut className={`w-4 h-4 ${logoutLoading ? 'animate-spin' : ''}`} />
                      <span>{logoutLoading ? 'Cerrando...' : 'Cerrar Sesión'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="p-6 relative z-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-embler-yellow animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Cargando estadísticas...</p>
            </div>
          </div>
        )}

        {error && (
          <motion.div 
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </motion.div>
        )}

        {stats && (
          <div className="space-y-8">
            {/* Usuarios */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-embler-yellow" />
                Gestión de Usuarios
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                  title="Total Usuarios"
                  value={stats.users.total}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Usuarios Activos"
                  value={stats.users.active}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Usuarios Inactivos"
                  value={stats.users.inactive}
                  icon={XCircle}
                  color="red"
                />
                <StatCard
                  title="Administradores"
                  value={stats.users.admins}
                  icon={Activity}
                  color="purple"
                />
                <StatCard
                  title="Agentes"
                  value={stats.users.agents}
                  icon={MessageCircle}
                  color="yellow"
                />
              </div>
            </motion.section>

            {/* Pedidos */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-embler-yellow" />
                Gestión de Pedidos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Pedidos"
                  value={stats.orders.total}
                  icon={ShoppingCart}
                  color="blue"
                />
                <StatCard
                  title="Pendientes"
                  value={stats.orders.pending}
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="Completados"
                  value={stats.orders.completed}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Cancelados"
                  value={stats.orders.cancelled}
                  icon={XCircle}
                  color="red"
                />
              </div>
            </motion.section>

            {/* Conversaciones */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-embler-yellow" />
                Conversaciones de WhatsApp
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Conversaciones"
                  value={stats.conversations.total}
                  icon={MessageCircle}
                  color="blue"
                />
                <StatCard
                  title="Conversaciones Activas"
                  value={stats.conversations.active}
                  icon={Activity}
                  color="green"
                />
                <StatCard
                  title="Conversaciones Cerradas"
                  value={stats.conversations.closed}
                  icon={CheckCircle}
                  color="gray"
                />
                <StatCard
                  title="Mensajes Sin Leer"
                  value={stats.conversations.unread}
                  icon={AlertCircle}
                  color="red"
                />
              </div>
            </motion.section>

            {/* Estado del Sistema */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Server className="w-5 h-5 mr-2 text-embler-yellow" />
                Estado del Sistema
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Tiempo Activo"
                  value={stats.system.uptime}
                  icon={Clock}
                  color="green"
                  subtitle="Servidor funcionando"
                />
                <StatCard
                  title="Uso de Memoria"
                  value={stats.system.memory}
                  icon={Database}
                  color="blue"
                  subtitle="Consumo actual"
                />
                <StatCard
                  title="Base de Datos"
                  value={stats.system.database}
                  icon={Database}
                  color="green"
                  subtitle="Conexión establecida"
                />
                <StatCard
                  title="Último Backup"
                  value={stats.system.lastBackup}
                  icon={CheckCircle}
                  color="purple"
                  subtitle="Respaldo automático"
                />
              </div>
            </motion.section>

            {/* Indicadores de Estado */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">Indicadores de Estado</h2>
              <div className="bg-glass-dark backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-white font-medium mb-3">Servicios</h3>
                    <StatusIndicator status="online" label="API de WhatsApp" />
                    <StatusIndicator status="online" label="Base de Datos" />
                    <StatusIndicator status="online" label="Servidor Web" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-white font-medium mb-3">Seguridad</h3>
                    <StatusIndicator status="online" label="Autenticación" />
                    <StatusIndicator status="online" label="CORS Configurado" />
                    <StatusIndicator status="online" label="Rate Limiting" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-white font-medium mb-3">Integraciones</h3>
                    <StatusIndicator status="online" label="Supabase" />
                    <StatusIndicator status="online" label="WhatsApp Business" />
                    <StatusIndicator status="warning" label="IA Chatbot" />
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Navegación Rápida */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-embler-yellow" />
                Navegación Rápida
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.button
                  onClick={() => window.location.href = '/client-chat'}
                  className="bg-glass-dark backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-embler-yellow/20 rounded-xl flex items-center justify-center group-hover:bg-embler-yellow/30 transition-colors">
                      <MessageCircle className="w-6 h-6 text-embler-yellow" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">Chat Cliente</h3>
                      <p className="text-gray-400 text-sm">Simular conversación con el chatbot</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => window.location.href = '/whatsapp-test'}
                  className="bg-glass-dark backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">WhatsApp Test</h3>
                      <p className="text-gray-400 text-sm">Probar funcionalidades de WhatsApp</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={handleClearSessions}
                  disabled={clearSessionsLoading}
                  className="bg-glass-dark backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                      <Trash2 className={`w-6 h-6 text-red-500 ${clearSessionsLoading ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">Limpiar Sesiones</h3>
                      <p className="text-gray-400 text-sm">Limpiar todas las sesiones del servidor</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 