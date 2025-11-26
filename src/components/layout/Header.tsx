import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/auth';
import { Button } from '../ui';
import { useState } from 'react';

export function Header() {
  const { user, firebaseUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-playa-surface/80 backdrop-blur-md border-b border-playa-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent">
              ATS Camp
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className="text-gray-400 hover:text-white transition-colors">
              About
            </Link>
            <Link to="/info" className="text-gray-400 hover:text-white transition-colors">
              Info
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>

            {firebaseUser && (
              <>
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link to="/map" className="text-gray-400 hover:text-white transition-colors">
                  Map
                </Link>
                <Link to="/shifts" className="text-gray-400 hover:text-white transition-colors">
                  Shifts
                </Link>
                <Link to="/members" className="text-gray-400 hover:text-white transition-colors">
                  Members
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-neon-purple hover:text-neon-purple/80 transition-colors">
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-playa-card flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user?.displayName?.charAt(0).toUpperCase()}
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
              <Link to="/about" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <Link to="/info" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Info
              </Link>
              <Link to="/contact" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </Link>

              {firebaseUser && (
                <>
                  <Link to="/dashboard" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/map" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                    Map
                  </Link>
                  <Link to="/shifts" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                    Shifts
                  </Link>
                  <Link to="/members" className="text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                    Members
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="text-neon-purple hover:text-neon-purple/80 py-2" onClick={() => setMobileMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                </>
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
