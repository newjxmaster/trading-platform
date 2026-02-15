import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/helpers';
import { AlertCircle } from 'lucide-react';

// ============================================
// Input Props Interface
// ============================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ============================================
// Input Component
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-secondary-700"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border bg-white text-secondary-900 placeholder-secondary-400 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
              error
                ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500'
                : 'border-secondary-300 hover:border-secondary-400',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              'px-4 py-2.5 text-sm',
              className
            )}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Helper Text or Error */}
        {(helperText || error) && (
          <div className="flex items-center gap-1.5">
            {error && <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />}
            <p
              className={cn(
                'text-sm',
                error ? 'text-danger-600' : 'text-secondary-500'
              )}
            >
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
