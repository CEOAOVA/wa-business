import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  fullWidth?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = "",
  fullWidth = false,
  gradient = true,
  glow = false
}) => {
  const baseClasses = "relative overflow-hidden rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
    xl: "px-8 py-5 text-xl"
  };

  const variantClasses = {
    primary: gradient 
      ? "btn-gradient-primary text-white focus:ring-blue-500" 
      : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: gradient 
      ? "btn-gradient-secondary text-white focus:ring-pink-500" 
      : "bg-pink-600 hover:bg-pink-700 text-white focus:ring-pink-500",
    accent: gradient 
      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white focus:ring-cyan-500" 
      : "bg-cyan-600 hover:bg-cyan-700 text-white focus:ring-cyan-500",
    success: gradient 
      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white focus:ring-green-500" 
      : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    danger: gradient 
      ? "bg-gradient-to-r from-red-500 to-pink-500 text-white focus:ring-red-500" 
      : "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "bg-white/10 hover:bg-white/20 text-white border border-white/20 focus:ring-white/50"
  };

  const widthClass = fullWidth ? "w-full" : "";
  const glowClass = glow ? "shadow-glow" : "";

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const iconVariants = {
    initial: { rotate: 0 },
    hover: { rotate: 5 },
    tap: { rotate: -5 }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${glowClass} ${className}`}
      variants={buttonVariants}
      initial="initial"
      whileHover={loading ? "loading" : "hover"}
      whileTap="tap"
      animate={loading ? "loading" : "initial"}
    >
      {/* Efecto de brillo */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      {/* Icono izquierdo */}
      {Icon && iconPosition === 'left' && !loading && (
        <motion.div variants={iconVariants}>
          <Icon size={size === 'sm' ? 16 : size === 'lg' ? 20 : size === 'xl' ? 24 : 18} />
        </motion.div>
      )}

      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Contenido */}
      <span className="relative z-10">
        {children}
      </span>

      {/* Icono derecho */}
      {Icon && iconPosition === 'right' && !loading && (
        <motion.div variants={iconVariants}>
          <Icon size={size === 'sm' ? 16 : size === 'lg' ? 20 : size === 'xl' ? 24 : 18} />
        </motion.div>
      )}

      {/* Efecto de partículas en hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full opacity-60 animate-ping" />
        <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-white rounded-full opacity-40 animate-ping" style={{ animationDelay: '0.2s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-0.5 h-0.5 bg-white rounded-full opacity-40 animate-ping" style={{ animationDelay: '0.4s' }} />
      </motion.div>
    </motion.button>
  );
};

export default ModernButton; 