/**
 * Reusable modal component with overlay and focus management
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils'

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none m-4',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}) {
  const modalRef = React.useRef(null)

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Focus management
  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      if (firstElement) {
        firstElement.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOverlayClick = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  // Rendered via a portal directly on <body> so this always paints above
  // whatever tree it was triggered from (e.g. a modal opened from deep
  // inside the sidebar), regardless of DOM mount order among sibling
  // fixed-position UI (toasts, header dropdown, etc). z-[100] keeps it
  // above the rest of the app's z-50-and-below floating layers.
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div
        className="flex min-h-screen items-start sm:items-center justify-center p-4 py-8 text-center"
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity"
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            'relative transform overflow-y-auto max-h-[calc(100vh-4rem)] rounded-lg bg-[var(--color-surface-modal)] text-left shadow-xl transition-all w-full',
            sizeStyles[size],
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {title ? (
            <ModalHeader onClose={onClose} showCloseButton={showCloseButton}>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
            </ModalHeader>
          ) : (
            showCloseButton && (
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-[var(--color-surface-modal)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )
          )}
          
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({
  children,
  onClose,
  showCloseButton = true,
  className,
}) {
  return (
    <div className={cn('border-b border-[var(--color-border-primary)] px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function ModalBody({ children, className }) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn('border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-6 py-4', className)}>
      {children}
    </div>
  )
}

// Confirmation modal for destructive actions
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}){
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <ModalBody>
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      </ModalBody>
      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'btn',
              variant === 'danger' ? 'btn-danger' : 'btn-primary'
            )}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" />
                Loading...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  )
}