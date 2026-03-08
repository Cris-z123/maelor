import * as React from "react"
import { cn } from "@renderer/lib/utils"

// Toast types
export type ToastVariant = "default" | "destructive" | "success" | "warning"

interface ToastProps {
  id?: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastState extends ToastProps {
  id: string
  open: boolean
}

const ToastContext = React.createContext<{
  toasts: ToastState[]
  addToast: (toast: ToastProps) => void
  removeToast: (id: string) => void
} | null>(null)

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    // Remove from array after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  const addToast = React.useCallback((toast: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastState = {
      ...toast,
      id,
      open: true,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after duration
    const duration = toast.duration ?? 3000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  )
}

function ToastViewport() {
  const context = React.useContext(ToastContext)
  if (!context) return null

  const { toasts } = context

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-[420px] w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}

function Toast({ id, title, description, variant = "default", open: _open }: ToastState) {
  const context = React.useContext(ToastContext)
  if (!context) return null

  const { removeToast } = context

  const variantStyles = {
    default: "bg-background border-border",
    destructive: "bg-destructive text-destructive-foreground border-destructive",
    success: "bg-green-600 text-white border-green-700",
    warning: "bg-yellow-500 text-white border-yellow-600",
  }

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        variantStyles[variant]
      )}
    >
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

// Hook for using toast
export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a Toaster")
  }

  return {
    toast: (props: ToastProps) => {
      context.addToast(props)
    },
    dismiss: (id: string) => {
      context.removeToast(id)
    },
  }
}

export { Toast }
