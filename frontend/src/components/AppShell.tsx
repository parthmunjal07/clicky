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

  const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return `text-sm font-700 uppercase tracking-widest transition-colors ${
      isActive 
        ? 'text-[var(--text-primary)] underline decoration-[2.5px] underline-offset-4' 
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
    }`;
  };

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const base = "flex flex-col items-center justify-center flex-1 py-3 gap-1 font-700 transition-all text-[0.65rem] uppercase tracking-widest border-t-[2.5px] border-r-[2.5px] border-[var(--border)]";
    if (isActive) {
      return `${base} bg-[var(--accent-yellow)] shadow-[inset_0px_4px_0_rgba(26,26,26,0.15)]`;
    }
    return `${base} bg-[var(--surface)] hover:bg-[var(--bg)]`;
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Desktop Top Bar */}
      <header className="hidden md:flex justify-center px-6 sm:px-12 py-8 z-40 sticky top-0 bg-[var(--bg)]">
        <div className="flex items-center justify-between w-full px-8 py-2 border-[2.5px] border-[var(--border)] rounded-full bg-[var(--surface)] shadow-[4px_4px_0_var(--shadow)]">
          {/* Left: Logo */}
          <NavLink to="/home" className="flex items-center gap-3 group">
            <span className="nbr-display text-2xl tracking-tighter">Clicky</span>
          </NavLink>

          {/* Center: Main Nav */}
          <nav className="flex items-center gap-12">
            <NavLink to="/home" className={desktopNavLinkClass}>
              Home
            </NavLink>
            <NavLink to="/leaderboard" className={desktopNavLinkClass}>
              Leaderboard
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={desktopNavLinkClass}>
                Admin
              </NavLink>
            )}
          </nav>

          {/* Right: User / Logout */}
          <div className="flex items-center gap-8">
            <NavLink to="/profile" className={desktopNavLinkClass}>
              Profile
            </NavLink>
            <button 
              onClick={handleLogout} 
              className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-coral)] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
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
