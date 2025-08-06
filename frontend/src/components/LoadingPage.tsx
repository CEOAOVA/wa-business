// ✅ COMPONENTE DE CARGA - CREADO
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingPageProps {
  message?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-embler-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-embler-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <p className="text-gray-400 text-lg">{message}</p>
      </motion.div>
    </div>
  );
};

export default LoadingPage;