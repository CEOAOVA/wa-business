import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: 'primary' | 'secondary' | 'accent' | 'gold';
  delay?: number;
  className?: string;
  onClick?: () => void;
  stats?: {
    value: string;
    label: string;
  };
  badge?: string;
  status?: 'active' | 'inactive' | 'pending';
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  gradient = 'primary',
  delay = 0,
  className = "",
  onClick,
  stats,
  badge,
  status = 'active'
}) => {
  const gradientClasses = {
    primary: 'from-blue-500 to-purple-600',
    secondary: 'from-pink-500 to-red-500',
    accent: 'from-cyan-500 to-blue-500',
    gold: 'from-yellow-400 to-orange-500'
  };

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    pending: 'bg-yellow-500'
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: delay * 0.1
      }
    },
    hover: {
      y: -10,
      scale: 1.02,
      transition: {
        duration: 0.3
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        duration: 0.5,
        delay: delay * 0.1 + 0.2
      }
    },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onClick={onClick}
      className={`
        relative group cursor-pointer overflow-hidden
        card-modern p-6 shadow-soft
        ${onClick ? 'hover:shadow-glow' : ''}
        ${className}
      `}
    >
      {/* Fondo con gradiente sutil */}
      <div className={`
        absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} 
        opacity-5 group-hover:opacity-10 transition-opacity duration-300
      `} />

      {/* Badge de estado */}
      {badge && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay * 0.1 + 0.3 }}
          className="absolute top-4 right-4"
        >
          <span className="bg-gradient-primary text-white text-xs px-2 py-1 rounded-full font-medium shadow-glow">
            {badge}
          </span>
        </motion.div>
      )}

      {/* Indicador de estado */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
        <span className="text-xs text-gray-400 capitalize">{status}</span>
      </div>

      {/* Icono */}
      <motion.div
        variants={iconVariants}
        className={`
          w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientClasses[gradient]} 
          flex items-center justify-center mb-6 shadow-glow
          group-hover:shadow-lg transition-shadow duration-300
        `}
      >
        <Icon size={28} className="text-white" />
      </motion.div>

      {/* Contenido */}
      <div className="relative z-10">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay * 0.1 + 0.4 }}
          className="text-xl font-bold text-white mb-3 group-hover:text-gradient-primary transition-colors"
        >
          {title}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay * 0.1 + 0.5 }}
          className="text-gray-300 text-sm leading-relaxed mb-4"
        >
          {description}
        </motion.p>

        {/* Estadísticas */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1 + 0.6 }}
            className="flex items-center justify-between pt-4 border-t border-white/10"
          >
            <div>
              <div className="text-2xl font-bold text-white">{stats.value}</div>
              <div className="text-xs text-gray-400">{stats.label}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
              <Icon size={20} className="text-white/60" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Efecto de brillo al hacer hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      {/* Indicador de click */}
      {onClick && (
        <motion.div
          className="absolute bottom-4 right-4 text-white/40 group-hover:text-white/60 transition-colors"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay * 0.1 + 0.7 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FeatureCard; 