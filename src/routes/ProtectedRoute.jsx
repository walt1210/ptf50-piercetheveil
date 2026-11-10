import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../features/authentication/authService";

// Only admins sign in (customers book as guests). This only controls what the UI shows;
// the REAL protection is RLS in the database.
export default function ProtectedRoute({ requireAdmin = true, children }) {
  const { user, isAdmin, loading, profileError, retryProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-brand-muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  // Signed in, but the role could not be checked (for example a network drop): say so instead of
  // sending a real admin to the home page with no explanation.
  if (requireAdmin && profileError) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div role="alert" className="w-full max-w-md bg-brand-dark border border-brand-blood/30 p-10 text-center space-y-6">
          <p className="text-brand-cream">We could not check your account. Please check your connection and try again.</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={retryProfile}
              className="border border-brand-cream text-brand-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => signOut().catch(() => {})}
              className="border border-brand-blood/50 text-brand-muted px-6 py-2 text-xs uppercase tracking-widest hover:text-brand-cream transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children ?? <Outlet />;
}
