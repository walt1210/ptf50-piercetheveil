import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signOut } from '../features/authentication/authService';
import { toUserMessage } from '../services/api';
import { LayoutDashboard, CalendarDays, Clock, Scissors, Gem, Users, LogOut, Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOut = async () => {
    setSignOutError('');
    setSigningOut(true);
    try {
      await signOut();
      navigate('/admin/login', { replace: true });
    } catch (e) {
      setSignOutError(toUserMessage(e));
    } finally {
      setSigningOut(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
    { name: 'Schedule', path: '/admin/schedule', icon: Clock },
    { name: 'Services', path: '/admin/services', icon: Scissors },
    { name: 'Jewelry Catalog', path: '/admin/jewelry', icon: Gem },
    { name: 'Customers', path: '/admin/customers', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-brand-black text-brand-cream font-sans overflow-hidden">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 max-w-[85vw] flex-col border-r border-brand-blood/30 bg-brand-dark transition-transform duration-300 md:relative md:translate-x-0 ${
        isSidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full md:visible'
      }`}>
        <div className="p-8 border-b border-brand-blood/30 text-center">
          <h1 className="text-3xl font-serif text-brand-cream tracking-wider">Pierce<br/><span className="italic text-brand-blood">the</span> Veil</h1>
          <p className="text-[10px] text-brand-muted mt-4 uppercase tracking-[0.3em]">Admin Portal</p>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/admin' 
              ? location.pathname === '/admin' 
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 transition-all duration-300 ${
                  isActive 
                    ? 'border-l-2 border-brand-blood text-brand-cream bg-brand-blood/5' 
                    : 'border-l-2 border-transparent text-brand-muted hover:text-brand-cream hover:border-brand-muted/30'
                }`}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span className="font-light tracking-wide text-sm uppercase">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-brand-blood/30">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-4 px-4 py-2 w-full text-brand-muted hover:text-brand-cream transition-colors text-sm uppercase tracking-wide font-light disabled:opacity-50"
          >
            <LogOut size={18} strokeWidth={1.5} />
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
          {signOutError && <p role="alert" className="mt-2 px-4 text-xs text-red-400">{signOutError}</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-brand-black relative">
        <header className="flex items-center gap-4 border-b border-brand-blood/30 bg-brand-dark px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isSidebarOpen}
            className="text-brand-cream"
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-serif tracking-wide">Admin Portal</span>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}