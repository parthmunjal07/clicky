import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 w-full z-[9999] p-3 text-center"
          style={{
            background: 'var(--accent-coral)',
            color: '#fff',
            borderBottom: '2px solid var(--border)',
            boxShadow: '0 4px 0 var(--shadow)',
          }}
        >
          <span className="text-sm font-700 uppercase tracking-widest">
            You're offline
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
