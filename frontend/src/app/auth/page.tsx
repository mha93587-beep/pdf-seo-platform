'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/* ─── Inline Google "G" SVG icon ─── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

/* ─── Animated background orb ─── */
function BackgroundOrbs() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'orbFloat1 14s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'orbFloat2 16s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '60%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'orbFloat3 12s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signInWithPassword, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === 'login') {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Check your email to confirm your account.');
      }
    }
    setSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  /* ─── Styles ─── */
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0e1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24,
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    padding: '48px 40px',
    boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
    zIndex: 1,
  };

  const gradientBarStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60%',
    height: 3,
    borderRadius: '0 0 4px 4px',
    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
  };

  const logoStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 8,
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginBottom: 36,
    fontWeight: 400,
    letterSpacing: '0.01em',
  };

  const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '0.01em',
    transition: 'all 0.25s ease',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.35)',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
    letterSpacing: '0.02em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 0',
    border: 'none',
    borderRadius: 12,
    cursor: submitting ? 'wait' : 'pointer',
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '0.01em',
    color: '#fff',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    transition: 'opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 20px rgba(56,189,248,0.25)',
    opacity: submitting ? 0.7 : 1,
    fontFamily: 'inherit',
  };

  const dividerContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    margin: '24px 0',
  };

  const dividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.06)',
  };

  const dividerTextStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const googleButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 0',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease, border-color 0.2s ease',
    fontFamily: 'inherit',
  };

  const messageStyle = (isError: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
    marginTop: 20,
    background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
    color: isError ? '#f87171' : '#34d399',
    border: `1px solid ${isError ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)'}`,
  });

  return (
    <>
      {/* Inject keyframes for floating orbs */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.08); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -30px) scale(1.1); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.2);
        }
        input:focus {
          border-color: rgba(56,189,248,0.4) !important;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.08) !important;
        }
        button:hover {
          opacity: 0.92;
        }
        .auth-submit-btn:hover {
          box-shadow: 0 6px 28px rgba(56,189,248,0.35) !important;
          transform: translateY(-1px);
        }
        .auth-google-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.14) !important;
        }
      `}</style>

      <div style={pageStyle}>
        <BackgroundOrbs />

        <div
          style={{
            ...cardStyle,
            animation: 'fadeInUp 0.6s ease-out',
          }}
        >
          {/* Gradient accent bar */}
          <div style={gradientBarStyle} />

          {/* Logo */}
          <div style={logoStyle}>
            <h1 style={logoTextStyle}>DocuSEO</h1>
          </div>
          <p style={subtitleStyle}>
            {mode === 'login'
              ? 'Welcome back. Sign in to your account.'
              : 'Create your account and start optimizing.'}
          </p>

          {/* Tab switcher */}
          <div style={tabContainerStyle}>
            <button
              type="button"
              style={tabStyle(mode === 'login')}
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              style={tabStyle(mode === 'signup')}
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccess(null);
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="auth-email" style={labelStyle}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="auth-password" style={labelStyle}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="auth-submit-btn"
              style={submitButtonStyle}
            >
              {submitting
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div style={dividerContainerStyle}>
            <div style={dividerLineStyle} />
            <span style={dividerTextStyle}>or</span>
            <div style={dividerLineStyle} />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            style={googleButtonStyle}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Messages */}
          {error && <div style={messageStyle(true)}>{error}</div>}
          {success && <div style={messageStyle(false)}>{success}</div>}
        </div>
      </div>
    </>
  );
}
