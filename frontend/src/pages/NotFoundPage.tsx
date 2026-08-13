import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative nbr-dot-grid px-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="nbr-display-heavy" style={{ fontSize: '6rem', lineHeight: 1, color: 'var(--text-primary)' }}>
            404
          </h1>
          <p className="text-xl font-700 uppercase tracking-widest mt-4" style={{ color: 'var(--text-muted)' }}>
            Page not found
          </p>
        </div>
        <button
          onClick={() => navigate('/home')}
          className="nbr-btn w-full flex items-center justify-center"
          style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
