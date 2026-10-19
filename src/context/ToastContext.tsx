import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type Kind = 'success' | 'error';
interface ToastItem { id: number; message: string; kind: Kind }
interface ToastApi { show: (message: string, kind?: Kind) => void }

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
