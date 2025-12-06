'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, CheckCircle, HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

export interface ConfirmDialogOptions {
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  /** If true, shows a loading state on confirm button */
  loading?: boolean
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  /** Shorthand for delete confirmations */
  confirmDelete: (itemName?: string) => Promise<boolean>
}

// ============================================================================
// Context
// ============================================================================

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null)

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider')
  }
  return context
}

// ============================================================================
// Variant Styling
// ============================================================================

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle
  iconColor: string
  iconBg: string
  confirmButtonClass: string
}> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: HelpCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
}

// ============================================================================
// Provider Component
// ============================================================================

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'info',
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'info',
        resolve,
      })
    })
  }, [])

  const confirmDelete = useCallback((itemName?: string): Promise<boolean> => {
    return confirm({
      title: 'Delete Confirmation',
      message: itemName 
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })
  }, [confirm])

  const handleClose = useCallback((result: boolean) => {
    if (state.resolve) {
      state.resolve(result)
    }
    setState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const config = variantConfig[state.variant || 'info']
  const Icon = config.icon

  return (
    <ConfirmDialogContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      
      {state.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => handleClose(false)}
          />
          
          {/* Dialog */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              {/* Close button */}
              <button
                onClick={() => handleClose(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  {/* Icon */}
                  <div className={cn(
                    "mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10",
                    config.iconBg
                  )}>
                    <Icon className={cn("h-6 w-6", config.iconColor)} />
                  </div>
                  
                  {/* Content */}
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      {state.title}
                    </h3>
                    <div className="mt-2">
                      {typeof state.message === 'string' ? (
                        <p className="text-sm text-gray-500">{state.message}</p>
                      ) : (
                        state.message
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <Button
                  onClick={() => handleClose(true)}
                  className={cn(config.confirmButtonClass, "sm:ml-3")}
                >
                  {state.confirmText}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  {state.cancelText}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmDialogContext.Provider>
  )
}

// ============================================================================
// Standalone Component (for cases where context isn't available)
// ============================================================================

interface ConfirmDialogProps extends ConfirmDialogOptions {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const config = variantConfig[variant]
  const Icon = config.icon

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              <div className={cn(
                "mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10",
                config.iconBg
              )}>
                <Icon className={cn("h-6 w-6", config.iconColor)} />
              </div>
              
              {/* Content */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  {typeof message === 'string' ? (
                    <p className="text-sm text-gray-500">{message}</p>
                  ) : (
                    message
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
            <Button
              onClick={onConfirm}
              className={cn(config.confirmButtonClass, "sm:ml-3")}
            >
              {confirmText}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

