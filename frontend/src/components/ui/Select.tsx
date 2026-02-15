import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/helpers';
import { ChevronDown, AlertCircle } from 'lucide-react';

// ============================================
// Select Option Interface
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================
// Select Props Interface
// ============================================

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

// ============================================
// Select Component
// ============================================

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      fullWidth = true,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-secondary-700"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'block w-full appearance-none rounded-lg border bg-white text-secondary-900 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
              error
                ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500'
                : 'border-secondary-300 hover:border-secondary-400',
              'px-4 py-2.5 pr-10 text-sm',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
            <ChevronDown className="w-5 h-5" />
          </div>
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

Select.displayName = 'Select';

export default Select;
