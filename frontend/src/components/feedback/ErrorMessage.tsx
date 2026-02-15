import React from 'react';
import { cn } from '@utils/helpers';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@components/ui/Button';

// ============================================
// Error Message Props Interface
// ============================================

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
  variant?: 'inline' | 'card' | 'page';
}

// ============================================
// Error Message Component
// ============================================

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  onBack,
  className,
  variant = 'inline',
}) => {
  // Inline variant - compact error display
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-danger-600 bg-danger-50 px-3 py-2 rounded-lg',
          className
        )}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  // Card variant - medium error display
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'bg-white border border-danger-200 rounded-xl p-6 text-center',
          className
        )}
      >
        <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-danger-600" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          {title}
        </h3>
        <p className="text-secondary-600 mb-4">{message}</p>
        {(onRetry || onBack) && (
          <div className="flex items-center justify-center gap-3">
            {onBack && (
              <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Go Back
              </Button>
            )}
            {onRetry && (
              <Button onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Page variant - full page error display
  return (
    <div
      className={cn(
        'min-h-[60vh] flex items-center justify-center p-4',
        className
      )}
    >
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-danger-600" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 mb-3">
          {title}
        </h1>
        <p className="text-secondary-600 mb-8">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {onBack && (
            <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Go Back
            </Button>
          )}
          {onRetry && (
            <Button onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Not Found Component
// ============================================

export const NotFound: React.FC<{
  title?: string;
  message?: string;
  onBack?: () => void;
}> = ({
  title = 'Page Not Found',
  message = 'The page you are looking for does not exist or has been moved.',
  onBack,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-9xl font-bold text-secondary-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-secondary-900 mb-3">{title}</h1>
        <p className="text-secondary-600 mb-8">{message}</p>
        {onBack && (
          <Button onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Go Back Home
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================
// Empty State Component
// ============================================

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-secondary-400">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-secondary-900 mb-2">{title}</h3>
      {description && <p className="text-secondary-600 mb-6 max-w-sm mx-auto">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default ErrorMessage;
