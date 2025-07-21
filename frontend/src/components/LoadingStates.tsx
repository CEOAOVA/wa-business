import React from 'react';

// Tipos de loading
export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';

// Tamaños de loading
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Props base para componentes de loading
interface LoadingProps {
  size?: LoadingSize;
  className?: string;
  color?: string;
}

// Spinner circular
export const Spinner: React.FC<LoadingProps> = ({ 
  size = 'md', 
  className = '', 
  color = 'currentColor' 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg
        className="w-full h-full"
        fill="none"
        viewBox="0 0 24 24"
        style={{ color }}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Dots animados
export const LoadingDots: React.FC<LoadingProps> = ({ 
  size = 'md', 
  className = '', 
  color = 'currentColor' 
}) => {
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} rounded-full bg-current animate-pulse`}
          style={{ 
            color,
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );
};

// Pulse
export const LoadingPulse: React.FC<LoadingProps> = ({ 
  size = 'md', 
  className = '', 
  color = 'currentColor' 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full animate-pulse ${className}`}
      style={{ backgroundColor: color }}
    />
  );
};

// Skeleton para contenido
interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  lines = 1, 
  height = 'h-4',
  width = 'w-full'
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} ${width} bg-gray-200 rounded animate-pulse`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
};

// Skeleton para chat
export const ChatSkeleton: React.FC = () => {
  return (
    <div className="flex items-start space-x-3 p-4 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
};

// Skeleton para lista de chats
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  );
};

// Progress bar
interface ProgressProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  color?: string;
}

export const ProgressBar: React.FC<ProgressProps> = ({ 
  progress, 
  className = '', 
  showPercentage = false,
  color = 'bg-blue-500'
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-sm text-gray-600 mt-1 text-center">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
};

// Loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  type?: LoadingType;
  size?: LoadingSize;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Cargando...',
  type = 'spinner',
  size = 'lg'
}) => {
  if (!isLoading) return <>{children}</>;

  const LoadingComponent = (() => {
    switch (type) {
      case 'spinner':
        return Spinner;
      case 'dots':
        return LoadingDots;
      case 'pulse':
        return LoadingPulse;
      default:
        return Spinner;
    }
  })();

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingComponent size={size} className="mx-auto mb-2" />
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Loading button
interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  loadingText = 'Cargando...',
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      disabled={isLoading || disabled}
      onClick={onClick}
      className={`
        px-4 py-2 rounded-md font-medium transition-colors
        ${isLoading || disabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-blue-500 text-white hover:bg-blue-600'
        }
        ${className}
      `}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Spinner size="sm" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Loading page
interface LoadingPageProps {
  message?: string;
  type?: LoadingType;
  size?: LoadingSize;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Cargando aplicación...',
  type = 'spinner',
  size = 'xl'
}) => {
  const LoadingComponent = (() => {
    switch (type) {
      case 'spinner':
        return Spinner;
      case 'dots':
        return LoadingDots;
      case 'pulse':
        return LoadingPulse;
      case 'skeleton':
        return Skeleton;
      case 'progress':
        return () => <ProgressBar progress={50} className="mx-auto mb-4" />;
      default:
        return Spinner;
    }
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingComponent size={size} className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          {message}
        </h2>
        <p className="text-gray-500">
          Por favor espera mientras cargamos todo...
        </p>
      </div>
    </div>
  );
};

// Hook para manejar estados de loading
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const withLoading = React.useCallback(async <T,>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await operation();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    setIsLoading,
    withLoading,
  };
}; 