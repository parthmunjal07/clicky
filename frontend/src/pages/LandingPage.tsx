import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const handleAuthNavigate = (tab?: 'login' | 'signup') => {
    navigate(`/auth${tab ? `?tab=${tab}` : '?tab=signup'}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header Bar */}
      <header className="flex justify-center px-3 sm:px-12 py-5 z-40 sticky top-0 bg-[var(--bg)]">
        <div className="flex items-center justify-between w-full px-8 py-2 border-[2.5px] border-[var(--border)] rounded-full bg-[var(--surface)] shadow-[4px_4px_0_var(--shadow)] max-w-[1200px]">
          {/* Left: Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
          >
            <span className="nbr-display text-2xl tracking-tighter">Clicky</span>
          </button>

          {/* Right: Auth Links */}
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                  Welcome, {user?.username || 'Player'}!
                </span>
                <button
                  onClick={() => navigate('/home')}
                  className="nbr-btn flex items-center justify-center px-6 py-3"
                >
                  START PLAYING
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAuthNavigate('login')}
                  className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => handleAuthNavigate('signup')}
                  className="nbr-btn flex items-center justify-center px-6 py-3"
                >
                  SIGN UP
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 sm:px-12 py-16 nbr-dot-grid">
        
        {/* Hero Section */}
        <section className="w-full max-w-[800px] flex flex-col items-center gap-12 mb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <h1 
              className="nbr-display-heavy text-5xl sm:text-6xl uppercase leading-tight text-[var(--text-primary)]"
              style={{ textWrap: 'balance' }}
            >
              How fast can you click?
            </h1>
            <p 
              className="text-lg sm:text-xl text-[var(--text-muted)] max-w-[550px]"
              style={{ textWrap: 'balance' }}
            >
              Challenge yourself. Compete globally. Dominate the leaderboard.
            </p>
            <button
              onClick={() => isAuthenticated ? navigate('/home') : handleAuthNavigate('signup')}
              className="nbr-btn flex items-center justify-center px-8 py-4 text-lg mt-4"
            >
              {isAuthenticated ? 'START PLAYING' : 'PLAY NOW'}
            </button>
          </motion.div>

        </section>

        {/* How It Works Section */}
        <section className="w-full max-w-[900px] mb-32">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="nbr-display-heavy text-4xl uppercase text-center mb-16 text-[var(--text-primary)]"
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Sign Up', desc: 'Create your account in seconds' },
              { step: 2, title: 'Pick a Mode', desc: 'Timer or Clicks — choose your challenge' },
              { step: 3, title: 'Climb the Leaderboard', desc: 'Beat your best and compete globally' },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: item.step * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-4 p-6 bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-lg text-center"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-full text-white font-700 text-lg"
                  style={{ backgroundColor: 'var(--accent-coral)' }}
                >
                  {item.step}
                </div>
                <h3 className="font-700 uppercase tracking-widest text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Modes Preview Section */}
        <section className="w-full max-w-[900px] mb-32">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="nbr-display-heavy text-4xl uppercase text-center mb-16 text-[var(--text-primary)]"
          >
            Game Modes
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              {
                mode: 'Timer Mode',
                desc: 'Race against the clock. How many clicks in 60s, 30s, or 10s?',
                color: 'var(--accent-coral)',
              },
              {
                mode: 'Clicks Mode',
                desc: 'Hit a target. Reach 50, 25, or 10 clicks as fast as you can.',
                color: 'var(--accent-teal)',
              },
            ].map((item) => (
              <motion.div
                key={item.mode}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="p-8 bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-lg"
              >
                <div
                  className="w-full h-2 rounded-full mb-6"
                  style={{ backgroundColor: item.color }}
                />
                <h3 className="nbr-display-heavy text-2xl uppercase mb-3 text-[var(--text-primary)]">
                  {item.mode}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Leaderboard Teaser Section */}
        <section className="w-full max-w-[900px] mb-32">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="nbr-display-heavy text-4xl uppercase text-center mb-16 text-[var(--text-primary)]"
          >
            Top Performers
          </motion.h2>

          <div className="space-y-4">
            {[
              { rank: 1, username: 'speedclick', cps: 18.5 },
              { rank: 2, username: 'clickmaster', cps: 17.2 },
              { rank: 3, username: 'fastfingers', cps: 16.8 },
            ].map((entry) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: entry.rank * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center justify-between p-6 bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-full text-white font-700"
                    style={{ backgroundColor: 'var(--accent-yellow)' }}
                  >
                    #{entry.rank}
                  </div>
                  <span className="nbr-display text-lg text-[var(--text-primary)]">
                    {entry.username}
                  </span>
                </div>
                <span className="nbr-mono text-lg font-700 text-[var(--text-primary)]">
                  {entry.cps} CPS
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer CTA Section */}
        <section className="w-full max-w-[800px] mb-16 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-6"
          >
            <h2 className="nbr-display text-3xl uppercase text-[var(--text-primary)]">
              Ready to compete?
            </h2>
            {!isAuthenticated && (
              <button
                onClick={() => handleAuthNavigate('signup')}
                className="nbr-btn flex items-center justify-center px-8 py-4 text-lg"
              >
                SIGN UP FOR FREE
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={() => navigate('/home')}
                className="nbr-btn flex items-center justify-center px-8 py-4 text-lg"
              >
                GO TO DASHBOARD
              </button>
            )}
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex justify-center px-6 sm:px-12 py-8 border-t-[2.5px] border-[var(--border)]">
        <div className="text-center text-sm text-[var(--text-muted)]">
          <p>© 2026 Clicky. Built with passion for speed enthusiasts.</p>
        </div>
      </footer>
    </div>
  );
}
