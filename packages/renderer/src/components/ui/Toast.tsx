import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 4000;

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_CLASS = {
  success: "border-kado-success/50 bg-kado-success/10 text-kado-success",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
  warning: "border-kado-warning/50 bg-kado-warning/10 text-kado-warning",
  info: "border-primary/50 bg-primary/10 text-primary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = { id, message, type, createdAt: Date.now() };
      setToasts((prev) => [...prev, item]);
      const t = setTimeout(() => dismiss(id), DISMISS_MS);
      timers.current.set(id, t);
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((item) => (
          <ToastNotification key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNotification({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[item.type];
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-[slideIn_0.2s_ease-out]",
        "bg-card backdrop-blur-sm",
        VARIANT_CLASS[item.type]
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-sm text-foreground">{item.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-1 text-muted-foreground hover:bg-layer-hover hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
