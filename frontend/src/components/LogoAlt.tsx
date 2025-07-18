import React from 'react';
import { motion } from 'framer-motion';
import logemblerImage from '/logembler.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

const LogoAlt: React.FC<LogoProps> = ({
  size = 'md',
  className = "",
  animate = true
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14'
  };

  const LogoImage = () => (
    <motion.img 
      src={logemblerImage}
      alt="Logo" 
      className={`${sizeClasses[size]} rounded-xl shadow-soft border border-white/10 ${className}`}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 0 20px rgba(102, 126, 234, 0.3)"
      }}
      transition={{ duration: 0.3 }}
      onError={(e) => {
        console.error('Error loading logo image:', e);
        // Fallback minimalista sin texto
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent) {
          const fallback = document.createElement('div');
          fallback.className = `${sizeClasses[size]} bg-gradient-primary rounded-xl shadow-soft border border-white/10 ${className}`;
          parent.appendChild(fallback);
        }
      }}
    />
  );

  if (animate) {
    return (
      <motion.div 
        className="flex items-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <LogoImage />
      </motion.div>
    );
  }

  return (
    <div className="flex items-center">
      <img 
        src={logemblerImage}
        alt="Logo" 
        className={`${sizeClasses[size]} rounded-xl shadow-soft border border-white/10 ${className}`}
        onError={(e) => {
          console.error('Error loading logo image:', e);
          // Fallback minimalista sin texto
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = `${sizeClasses[size]} bg-gradient-primary rounded-xl shadow-soft border border-white/10 ${className}`;
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
};

export default LogoAlt; 