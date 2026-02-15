import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@utils/helpers';
import { X } from 'lucide-react';
import { Button } from './Button';

// ============================================
// Modal Props Interface
// ============================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

// ============================================
// Modal Component
// ============================================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
}) => {
  // Handle escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up',
          sizeStyles[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-secondary-100">
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-secondary-900"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="text-sm text-secondary-500 mt-1"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 -mr-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('px-6', !title && !showCloseButton && 'pt-6', !footer && 'pb-6')}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-100 bg-secondary-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ============================================
// Confirm Modal Component
// ============================================

export interface ConfirmModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'danger' | 'success';
  isConfirming?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  isConfirming = false,
  ...props
}) => {
  return (
    <Modal
      {...props}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isConfirming}
            loadingText={confirmText}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-secondary-700">
        Are you sure you want to proceed with this action?
      </p>
    </Modal>
  );
};

export default Modal;
