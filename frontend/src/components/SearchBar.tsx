import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, Sparkles } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  className?: string;
  showFilters?: boolean;
  filters?: Array<{ id: string; label: string; active: boolean }>;
  onFilterChange?: (filterId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Buscar conversaciones, clientes, mensajes...",
  onSearch,
  onClear,
  className = "",
  showFilters = false,
  filters = [],
  onFilterChange
}) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sugerencias de búsqueda
  const suggestions = [
    "Conversaciones activas",
    "Mensajes no leídos",
    "Clientes prioritarios",
    "Chats recientes",
    "Búsqueda por fecha"
  ];

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        onSearch(query);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        onClear?.();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch, onClear]);

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(false);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Barra de búsqueda principal */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className={`
          relative flex items-center bg-embler-gray rounded-xl border border-embler-grayLight 
          transition-all duration-300 shadow-soft
          ${isFocused ? 'border-embler-yellow shadow-glow scale-105' : 'hover:border-embler-grayLighter'}
        `}>
          {/* Icono de búsqueda */}
          <div className="absolute left-3 text-gray-400">
            <Search size={18} className={isFocused ? 'text-white' : ''} />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={placeholder}
            className={`
              w-full py-2.5 bg-transparent text-white placeholder-gray-400
              focus:outline-none text-sm font-medium
              ${query && showFilters ? 'px-16' : 'px-10'}
            `}
          />

          {/* Botón de filtros */}
          {showFilters && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`absolute p-1.5 text-gray-400 hover:text-white transition-colors ${
                query ? 'right-10' : 'right-3'
              }`}
            >
              <Filter size={18} />
            </motion.button>
          )}

          {/* Botón de limpiar */}
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClear}
                className="absolute right-3 p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Efecto de brillo */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: isFocused ? '100%' : '-100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>

      {/* Filtros */}
      {showFilters && filters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-3 space-y-2"
        >
          {/* Título de filtros */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-embler-yellow rounded-full"></div>
            <span className="text-xs font-medium text-gray-300">Filtros rápidos</span>
          </div>
          
          {/* Botones de filtros */}
          <div className="grid grid-cols-2 gap-2">
            {filters.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onFilterChange?.(filter.id)}
                className={`
                  w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                  ${filter.active 
                    ? 'bg-embler-yellow text-black shadow-glow' 
                    : 'bg-embler-gray text-gray-300 hover:bg-embler-grayLight hover:text-white border border-embler-grayLight'
                  }
                `}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sugerencias */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-glass-dark rounded-xl border border-white/10 shadow-soft z-50"
          >
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 border-b border-white/10">
                <Sparkles size={14} />
                <span>Sugerencias de búsqueda</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de búsqueda activa */}
      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
          >
            <div className="bg-gradient-primary text-white text-xs px-2 py-0.5 rounded-full shadow-glow">
              Buscando...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar; 