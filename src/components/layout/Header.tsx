import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/auth';
import { Button } from '../ui';
import { useState } from 'react';

export function Header() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navClass = (href: string) =>
    `transition-colors ${
      pathname === href
        ? 'text-white font-medium border-b-2 border-neon-orange pb-0.5'
        : 'text-gray-400 hover:text-white'
    }`;

  const mobileNavClass = (href: string) =>
    `py-2 transition-colors ${
      pathname === href ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <header className="bg-playa-surface/80 backdrop-blur-md border-b border-playa-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent">
              ATS Camp
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className={navClass('/about')}>
              🏕️ About
            </Link>
            <Link to="/resources" className={navClass('/resources')}>
              📋 Resources
            </Link>

            {firebaseUser && (
              <Link to="/dashboard" className={navClass('/dashboard')}>
                🏠 Dashboard
              </Link>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  {(user?.photoURL || firebaseUser?.photoURL) ? (
                    <img
                      src={(user?.photoURL || firebaseUser?.photoURL)!}
                      alt={user?.displayName || firebaseUser?.displayName || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-playa-card border border-playa-border flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-300">
                        {(user?.displayName || firebaseUser?.displayName || firebaseUser?.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Join Camp</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-playa-border">
            <nav className="flex flex-col gap-3">
              <Link to="/about" className={mobileNavClass('/about')} onClick={() => setMobileMenuOpen(false)}>
                🏕️ About
              </Link>
              <Link to="/resources" className={mobileNavClass('/resources')} onClick={() => setMobileMenuOpen(false)}>
                📋 Resources
              </Link>

              {firebaseUser && (
                <Link to="/dashboard" className={mobileNavClass('/dashboard')} onClick={() => setMobileMenuOpen(false)}>
                  🏠 Dashboard
                </Link>
              )}

              <div className="pt-3 border-t border-playa-border">
                {firebaseUser ? (
                  <Button variant="ghost" className="w-full" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                    Sign Out
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full">Sign In</Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">Join Camp</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
