import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

const LogoDebug: React.FC<LogoProps> = ({
  size = 'md',
  className = "",
  animate = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14'
  };

  // Probar diferentes rutas
  const imagePaths = [
    '/logembler.jpg',
    './logembler.jpg',
    '../public/logembler.jpg',
    'logembler.jpg'
  ];

  useEffect(() => {
    // Debug: verificar si la imagen existe
    const testImage = new Image();
    testImage.onload = () => {
      console.log('✅ Logo image loaded successfully');
      setImageLoaded(true);
    };
    testImage.onerror = () => {
      console.log('❌ Logo image failed to load');
      setImageError(true);
    };
    testImage.src = '/logembler.jpg';
  }, []);

  const LogoImage = () => {
    if (imageError) {
      return (
        <div className={`${sizeClasses[size]} bg-gradient-primary rounded-xl shadow-soft border border-white/10 ${className}`}>
        </div>
      );
    }

    return (
      <motion.img 
        src="/logembler.jpg" 
        alt="Logo" 
        className={`${sizeClasses[size]} rounded-xl shadow-soft border border-white/10 ${className}`}
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 0 20px rgba(102, 126, 234, 0.3)"
        }}
        transition={{ duration: 0.3 }}
        onLoad={() => {
          console.log('✅ Logo image loaded in component');
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('❌ Error loading logo image:', e);
          setImageError(true);
        }}
      />
    );
  };

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
      <LogoImage />
    </div>
  );
};

export default LogoDebug; 