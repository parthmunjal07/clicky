import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../store/toast-store';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full p-4 text-center pointer-events-auto"
            style={{
              background: 'var(--surface)',
              border: '3px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '4px 4px 0 var(--shadow)',
            }}
          >
            <span className="text-sm font-700" style={{ color: 'var(--text-primary)' }}>
              {toast.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
