import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getProfile, signIn, signOut } from '../../features/authentication/authService';
import { toUserMessage } from '../../services/api';
import logo from '../../assets/PTV-logo.webp';

export default function Login() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // already signed in as admin -> go straight to the portal
  if (!loading && user && isAdmin) return <Navigate to="/admin" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user: signedIn } = await signIn({ email: email.trim(), password });
      const profile = await getProfile(signedIn.id);
      if (profile.role !== 'admin') {
        await signOut();
        setError('This account is not authorized for the admin portal.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-dark border border-brand-blood/30 p-10 shadow-2xl relative">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-brand-cream"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-brand-cream"></div>

        <div className="text-center mb-10">
          <div className="brand justify-center mb-5" aria-label="piercetheveil.ac admin portal">
            <span className="brand__mark shrink-0">
              <img src={logo} alt="" />
            </span>
            <span className="brand__name text-left text-brand-cream">
              piercetheveil.ac
              <small>Admin Portal</small>
            </span>
          </div>
          <p className="text-[10px] text-brand-muted uppercase tracking-[0.24em]">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-xs text-brand-muted uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-brand-blood/50 pb-2 text-brand-cream focus:outline-none focus:border-brand-cream transition-colors font-light"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-muted uppercase tracking-widest mb-2">Passcode</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-brand-blood/50 pb-2 text-brand-cream focus:outline-none focus:border-brand-cream transition-colors font-light"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 font-light">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-brand-cream text-brand-cream py-3 uppercase tracking-[0.2em] text-xs hover:bg-brand-cream hover:text-brand-black transition-all duration-300 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in…' : 'Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
