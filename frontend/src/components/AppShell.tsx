import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/auth-api';

export function AppShell() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore API failure, still log out locally
    }
    clearAuth();
    navigate('/login');
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) => {
    const base = "flex items-center gap-2 px-6 py-3 border-[2.5px] border-[var(--border)] rounded-full font-700 transition-all text-sm uppercase tracking-widest";
    if (isActive) {
      return `${base} bg-[var(--accent-yellow)] translate-x-[3px] translate-y-[3px] shadow-none`;
    }
    return `${base} bg-[var(--surface)] shadow-[3px_3px_0_var(--shadow)] hover:bg-[var(--bg)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--shadow)]`;
  };

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const base = "flex flex-col items-center justify-center flex-1 py-3 gap-1 font-700 transition-all text-[0.65rem] uppercase tracking-widest border-t-[2.5px] border-r-[2.5px] border-[var(--border)]";
    if (isActive) {
      return `${base} bg-[var(--accent-yellow)] shadow-[inset_0px_4px_0_rgba(26,26,26,0.15)]`;
    }
    return `${base} bg-[var(--surface)] hover:bg-[var(--bg)]`;
  };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Desktop Top Bar */}
      <header className="hidden md:flex items-center justify-between px-12 py-6 z-40 relative">
        <NavLink to="/home" className="flex items-center gap-4 group">
          <div className="flex items-center justify-center w-12 h-12 bg-[var(--accent-coral)] rounded-[12px] border-[2.5px] border-[var(--border)] shadow-[3px_3px_0_var(--shadow)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0_var(--shadow)] transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 3v8.5L10.5 9l2 4.5 1.5-.5-2-4.5L15 9V3H8Z" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="nbr-display text-2xl tracking-tighter">Clicky</span>
        </NavLink>

        <nav className="flex items-center gap-6">
          <NavLink to="/leaderboard" className={navLinkClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
          <button 
            onClick={handleLogout} 
            className="ml-6 text-sm font-700 uppercase tracking-widest nbr-link text-[var(--text-muted)]"
          >
            Logout
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-24 md:pb-12 pt-0 relative z-10 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex bg-[var(--surface)] border-t-[2.5px] border-[var(--border)]">
        <NavLink to="/home" className={mobileNavLinkClass}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Home</span>
        </NavLink>
        <NavLink to="/leaderboard" className={mobileNavLinkClass}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Rank</span>
        </NavLink>
        <NavLink to="/profile" className={mobileNavLinkClass}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={mobileNavLinkClass}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Admin</span>
          </NavLink>
        )}
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center justify-center flex-1 py-3 gap-1 font-700 transition-all text-[0.65rem] uppercase tracking-widest border-t-[2.5px] border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] text-[var(--text-muted)]"
          style={{ borderRight: 'none' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
