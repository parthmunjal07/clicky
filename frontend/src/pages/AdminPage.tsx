import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '../lib/admin-api';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../store/toast-store';

export function AdminPage() {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminUsers', page],
    queryFn: () => adminApi.getUsers(page, 20),
  });

  const users = data?.users || [];
  const pagination = data?.pagination;

  return (
    <div
      className="min-h-[100dvh] relative nbr-dot-grid flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="relative z-10 flex flex-col items-center pt-16 pb-32 px-6 sm:px-12 w-full max-w-[800px] mx-auto">
        <div className="w-full flex flex-col gap-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="nbr-display-heavy text-4xl uppercase" style={{ color: 'var(--text-primary)' }}>
                Admin Panel
              </h1>
              <p className="text-sm font-700 uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>
                User Management
              </p>
            </div>
            {pagination && (
              <div className="flex items-center gap-4">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="nbr-btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm font-700">Page {page} of {pagination.totalPages || 1}</span>
                <button 
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage(p => p + 1)}
                  className="nbr-btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="nbr-card flex flex-col p-4 gap-2">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-dashed border-[var(--border)] opacity-60">
              <span className="text-xs font-700 uppercase tracking-widest w-1/3">User</span>
              <span className="text-xs font-700 uppercase tracking-widest w-1/3 text-center">Joined</span>
              <span className="text-xs font-700 uppercase tracking-widest w-1/3 text-right">Role</span>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="nbr-lb-row flex items-center justify-between px-4 py-4 w-full opacity-50 animate-pulse">
                     <div className="w-1/3 h-6 bg-gray-300 rounded" />
                     <div className="w-1/3 flex justify-center"><div className="w-24 h-6 bg-gray-300 rounded" /></div>
                     <div className="w-1/3 flex justify-end"><div className="w-16 h-6 bg-gray-300 rounded" /></div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <span className="text-sm font-700 text-[var(--accent-coral)] uppercase tracking-widest">Failed to load users</span>
                <button onClick={() => refetch()} className="nbr-btn py-2 px-6 text-sm">Retry</button>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="text-sm font-700 text-[var(--text-muted)] uppercase tracking-widest">No users found</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="nbr-lb-row flex items-center justify-between px-4 py-4 w-full cursor-pointer hover:bg-[var(--accent-yellow)] transition-colors"
                  >
                    <div className="w-1/3 flex flex-col">
                      <span className="text-sm font-700 truncate">{user.username}</span>
                      <span className="text-xs text-[var(--text-muted)] truncate">{user.email}</span>
                    </div>
                    <div className="w-1/3 text-center">
                      <span className="nbr-mono text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="w-1/3 text-right">
                      <span className={`nbr-badge ${user.role === 'admin' ? 'nbr-badge-teal' : 'nbr-badge-blue'}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="nbr-card bg-[var(--surface)] w-full max-w-[480px] flex flex-col p-6 gap-6 relative"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 bg-[var(--surface)] border-[2px] border-[var(--border)] rounded-full p-2 shadow-[2px_2px_0_var(--shadow)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--shadow)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <div className="flex flex-col gap-1 pr-8">
                <h2 className="nbr-display-heavy text-2xl uppercase truncate">{selectedUser.username}</h2>
                <span className="text-xs font-700 text-[var(--text-muted)] truncate">{selectedUser.email}</span>
              </div>

              <div className="flex flex-col gap-4 p-6 border-[2.5px] border-dashed border-[var(--border)] rounded-[16px] bg-[#F8F9FA] items-center text-center">
                <span className="text-sm font-700 uppercase tracking-widest text-[var(--text-primary)]">
                  Session History
                </span>
                <span className="text-xs font-700 text-[var(--text-muted)]">
                  Coming soon
                </span>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider max-w-[250px]">
                  (GET /admin/users/:id/history endpoint missing on backend)
                </p>
              </div>

              <div className="flex flex-col gap-4 p-6 border-[2.5px] border-dashed border-[var(--border)] rounded-[16px] bg-[#FFF0ED] items-center text-center">
                <span className="text-sm font-700 uppercase tracking-widest text-[var(--accent-coral)]">
                  Account Actions
                </span>
                <span className="text-xs font-700 text-[var(--text-muted)]">
                  Unlock functionality coming soon
                </span>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider max-w-[250px]">
                  (Unlock user endpoint missing on backend)
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
