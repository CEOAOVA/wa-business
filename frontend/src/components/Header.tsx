import React from 'react';
import Logo from './Logo';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header className={`fixed top-0 left-0 z-[9999] p-4 ${className}`}>
      <Logo size="md" className="animate-fade-in-scale" />
    </header>
  );
};

export default Header; 