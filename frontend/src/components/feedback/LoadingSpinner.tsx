import React from 'react';
import { cn } from '@utils/helpers';
import { Loader2 } from 'lucide-react';

// ============================================
// Loading Spinner Props Interface
// ============================================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

// ============================================
// Loading Spinner Component
// ============================================

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  text,
  fullScreen = false,
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const variantStyles = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
  };

  const spinner = (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <Loader2
        className={cn(
          'animate-spin',
          sizeStyles[size],
          variantStyles[variant]
        )}
      />
      {text && (
        <p className={cn(
          'text-sm font-medium',
          variant === 'white' ? 'text-white' : 'text-secondary-600'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// ============================================
// Page Loading Component
// ============================================

export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

// ============================================
// Skeleton Loading Components
// ============================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const getDimension = (value: string | number | undefined) => {
    if (typeof value === 'number') return `${value}px`;
    return value;
  };

  return (
    <div
      className={cn(
        'bg-secondary-200',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: getDimension(width),
        height: getDimension(height),
        ...style,
      }}
      {...props}
    />
  );
};

// ============================================
// Card Skeleton Component
// ============================================

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-secondary-200 p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
      <Skeleton width="100%" height={80} variant="rounded" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  );
};

// ============================================
// Table Skeleton Component
// ============================================

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
      {/* Header */}
      <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={`${100 / columns}%`} height={20} />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-secondary-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width={`${100 / columns}%`} height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;
