import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '../lib/admin-api';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../store/toast-store';

function UserDetailModal({ user, onClose }: { user: AdminUser, onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['adminUserHistory', user.id],
    queryFn: () => adminApi.getUserHistory(user.id),
  });

  const unlockMutation = useMutation({
    mutationFn: () => adminApi.unlockUser(user.id),
    onSuccess: () => {
      showToast('User unlocked successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to unlock user');
    }
  });

  const recentSessions = historyData?.data?.user?.recentSessions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="nbr-card bg-[var(--surface)] w-full max-w-[480px] max-h-[80vh] overflow-y-auto flex flex-col p-6 gap-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-[var(--surface)] border-[2px] border-[var(--border)] rounded-full p-2 shadow-[2px_2px_0_var(--shadow)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--shadow)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="flex flex-col gap-1 pr-8">
          <h2 className="nbr-display-heavy text-2xl uppercase truncate">{user.username}</h2>
          <span className="text-xs font-700 text-[var(--text-muted)] truncate">{user.email}</span>
        </div>

        <div className="flex flex-col gap-4 p-6 border-[2.5px] border-dashed border-[var(--border)] rounded-[16px] bg-[#F8F9FA] items-center text-center">
          <span className="text-sm font-700 uppercase tracking-widest text-[var(--text-primary)]">
            Session History
          </span>
          <div className="flex flex-col gap-2 w-full mt-2">
            {isLoading ? (
              <span className="text-xs text-[var(--text-muted)] animate-pulse">Loading history...</span>
            ) : recentSessions.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)]">No sessions yet.</span>
            ) : (
              recentSessions.map((session: any) => (
                <div
                  key={session.id}
                  className="nbr-card-sm flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-700 text-[var(--text-primary)]">
                      {session.date}
                    </span>
                    <span className={`nbr-badge ${session.mode === 'Timer' ? 'nbr-badge-coral' : 'nbr-badge-blue'} !text-[10px]`}>
                      {session.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="nbr-mono text-lg text-[var(--text-primary)]">
                      {session.score}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 border-[2.5px] border-dashed border-[var(--border)] rounded-[16px] bg-[#FFF0ED] items-center text-center">
          <span className="text-sm font-700 uppercase tracking-widest text-[var(--accent-coral)]">
            Account Actions
          </span>
          <button 
            onClick={() => unlockMutation.mutate()}
            disabled={unlockMutation.isPending}
            className="nbr-btn-secondary py-2 px-6 text-sm"
          >
            {unlockMutation.isPending ? 'Unlocking...' : 'Unlock account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminUsers', page, debouncedSearch],
    queryFn: () => adminApi.getUsers(page, 20, debouncedSearch),
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination;

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

          <div className="w-full">
            <input 
              type="text" 
              placeholder="Search by username or email..." 
              className="w-full bg-[rgba(26,26,26,0.02)] border-[1.5px] border-[rgba(26,26,26,0.2)] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:bg-[var(--surface)] focus:border-[var(--border)] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="nbr-card-quiet flex flex-col p-4 gap-2">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-dashed border-[rgba(26,26,26,0.1)]">
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
              <div className="flex flex-col overflow-hidden">
                {users.map((user: AdminUser) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="nbr-row cursor-pointer hover:bg-[rgba(26,26,26,0.02)] w-full"
                  >
                    <div className="w-1/3 flex flex-col overflow-hidden">
                      <span className="text-sm font-700 truncate pr-2">{user.username}</span>
                      <span className="text-xs text-[var(--text-muted)] truncate pr-2">{user.email}</span>
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
          <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
