import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/helpers';
import { Loader2 } from 'lucide-react';

// ============================================
// Button Props Interface
// ============================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ============================================
// Button Component
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    // Variant styles
    const variantStyles = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
      secondary: 'bg-secondary-200 text-secondary-900 hover:bg-secondary-300 focus:ring-secondary-500',
      outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 bg-transparent',
      ghost: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500 bg-transparent',
      danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 shadow-sm',
      success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-sm',
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
      xl: 'px-8 py-4 text-lg gap-3',
    };

    // Icon size styles
    const iconSizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={cn(iconSizeStyles[size], 'animate-spin')} />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
