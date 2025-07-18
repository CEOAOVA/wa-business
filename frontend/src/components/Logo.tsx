import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showBorder = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const borderClass = showBorder ? 'border-2 border-white/20' : '';

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logembler.jpg"
        alt="Embler Logo"
        className={`${sizeClasses[size]} object-contain rounded-lg shadow-soft hover:shadow-glow transition-all duration-300 hover:scale-105 ${borderClass}`}
        onError={(e) => {
          console.error('Error loading logo:', e);
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = `${sizeClasses[size]} bg-gradient-yellow rounded-lg shadow-soft ${borderClass} flex items-center justify-center text-black font-bold text-xs`;
            fallback.textContent = 'EMBLER';
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
};

export default Logo; 