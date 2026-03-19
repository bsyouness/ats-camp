import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../contexts/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, firebaseUser, previewAsUser, setPreviewAsUser } = useAuth();
  const isActualAdmin = user?.role === 'admin';
  const showModeBanner = !!firebaseUser;

  return (
    <div className="min-h-screen flex flex-col bg-playa-dark">
      <div className="sticky top-0 z-50">
        {showModeBanner && isActualAdmin && !previewAsUser && (
          <div className="w-full bg-neon-purple/10 backdrop-blur-md border-b border-neon-purple/30 text-sm flex items-center justify-between px-4 py-2">
            <span className="text-neon-purple font-medium">Admin Mode</span>
            <button
              onClick={() => setPreviewAsUser(true)}
              className="px-3 py-1 rounded bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple font-medium transition-colors border border-neon-purple/40 text-xs"
            >
              Switch to Member View
            </button>
          </div>
        )}
        {showModeBanner && previewAsUser && (
          <div className="w-full bg-orange-600 text-white text-sm flex items-center justify-between px-4 py-2">
            <span className="font-medium">Member Preview Mode</span>
            <button
              onClick={() => setPreviewAsUser(false)}
              className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 font-medium transition-colors text-xs"
            >
              Switch to Admin Mode
            </button>
          </div>
        )}
        <Header />
      </div>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
