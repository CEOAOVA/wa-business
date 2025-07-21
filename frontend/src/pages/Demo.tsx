import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Zap, 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  Bell, 
  Search,
  ArrowRight,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import FeatureCard from '../components/FeatureCard';
import ModernButton from '../components/ModernButton';
import Logo from '../components/LogoAlt';

const Demo: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const features = [
    {
      icon: MessageCircle,
      title: "Chat en Tiempo Real",
      description: "Gestiona conversaciones de WhatsApp Business de forma profesional con interfaz moderna",
      gradient: "primary" as const,
      stats: { value: "1,234", label: "Conversaciones" },
      badge: "Nuevo",
      status: "active" as const
    },
    {
      icon: Zap,
      title: "IA Integrada",
      description: "Chatbot inteligente para respuestas automáticas y recopilación de datos avanzada",
      gradient: "secondary" as const,
      stats: { value: "98%", label: "Precisión" },
      badge: "Beta",
      status: "active" as const
    },
    {
      icon: Shield,
      title: "API Oficial Meta",
      description: "100% compatible con las políticas de WhatsApp Business y certificaciones",
      gradient: "accent" as const,
      stats: { value: "100%", label: "Compatible" },
      badge: "Verificado",
      status: "active" as const
    },
    {
      icon: Users,
      title: "Gestión de Equipos",
      description: "Administra múltiples agentes y asigna conversaciones de forma inteligente",
      gradient: "gold" as const,
      stats: { value: "25", label: "Agentes" },
      status: "pending" as const
    },
    {
      icon: BarChart3,
      title: "Analytics Avanzados",
      description: "Métricas detalladas y reportes personalizados para optimizar tu negocio",
      gradient: "primary" as const,
      stats: { value: "50+", label: "Métricas" },
      status: "active" as const
    },
    {
      icon: Settings,
      title: "Configuración Flexible",
      description: "Personaliza la plataforma según las necesidades específicas de tu empresa",
      gradient: "secondary" as const,
      status: "inactive" as const
    }
  ];

  const stats = [
    { label: "Conversaciones Activas", value: "1,234", icon: MessageCircle, color: "blue" },
    { label: "Tiempo Respuesta Promedio", value: "2.3s", icon: Zap, color: "green" },
    { label: "Satisfacción Cliente", value: "98%", icon: Star, color: "yellow" },
    { label: "Crecimiento Mensual", value: "+15%", icon: TrendingUp, color: "purple" }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark particles-bg relative overflow-x-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-primary rounded-full opacity-10"
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-secondary rounded-full opacity-10"
          animate={{ 
            y: [0, 30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-accent rounded-full opacity-5"
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
      <motion.header 
        className="relative z-10 px-8 py-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="xl" />
            <span className="text-gray-400 text-sm bg-white/10 px-3 py-1 rounded-full">Demo Moderno</span>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.div 
              className="flex items-center gap-2 bg-gradient-primary/20 px-4 py-2 rounded-full border border-blue-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Sistema Activo</span>
            </motion.div>
            
            <ModernButton variant="ghost" size="sm" icon={Bell}>
              Notificaciones
            </ModernButton>
          </div>
        </div>
      </motion.header>

      {/* Barra de búsqueda prominente */}
      <motion.section 
        className="relative z-10 px-8 py-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-5xl font-bold text-white text-center mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Descubre el Futuro del
            <span className="text-gradient-primary block"> WhatsApp Business</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-300 text-center mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Plataforma moderna con IA integrada, analíticas avanzadas y gestión inteligente de conversaciones
          </motion.p>

          <SearchBar
            placeholder="Buscar características, funcionalidades, configuraciones..."
            onSearch={setSearchQuery}
            onClear={() => setSearchQuery('')}
            showFilters={true}
            filters={[
              { id: 'all', label: 'Todo', active: selectedFilter === 'all' },
              { id: 'chat', label: 'Chat', active: selectedFilter === 'chat' },
              { id: 'ai', label: 'IA', active: selectedFilter === 'ai' },
              { id: 'analytics', label: 'Analíticas', active: selectedFilter === 'analytics' }
            ]}
            onFilterChange={setSelectedFilter}
            className="max-w-3xl mx-auto"
          />
        </div>
      </motion.section>

      {/* Estadísticas */}
      <motion.section 
        className="relative z-10 px-8 py-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="card-modern p-6 text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-12 h-12 bg-gradient-${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Cards de características */}
      <motion.section 
        className="relative z-10 px-8 py-12"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            className="text-4xl font-bold text-white text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
          >
            Características Principales
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
                delay={index}
                stats={feature.stats}
                badge={feature.badge}
                status={feature.status}
                onClick={() => console.log(`Clicked: ${feature.title}`)}
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Call to Action */}
      <motion.section 
        className="relative z-10 px-8 py-16"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.6 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            className="card-modern p-12"
            whileHover={{ scale: 1.02 }}
          >
            <motion.h2 
              className="text-4xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              ¿Listo para Transformar tu Negocio?
            </motion.h2>
            
            <motion.p 
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2 }}
            >
              Únete a miles de empresas que ya confían en nuestra plataforma para gestionar sus conversaciones de WhatsApp Business
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.2 }}
            >
              <ModernButton 
                variant="primary" 
                size="lg" 
                icon={ArrowRight} 
                iconPosition="right"
                glow={true}
                fullWidth={false}
              >
                Comenzar Ahora
              </ModernButton>
              
              <ModernButton 
                variant="ghost" 
                size="lg"
                fullWidth={false}
              >
                Ver Demo Completo
              </ModernButton>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 px-8 py-8 border-t border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.4 }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Logo size="sm" animate={false} />
            <p className="text-gray-400 text-sm">
              © 2024 Sistema. Todos los derechos reservados.
            </p>
          </div>
          <p className="text-gray-500 text-xs">
            Versión 2.0 • Powered by WhatsApp Business API • Diseño Moderno con Framer Motion
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default Demo; 