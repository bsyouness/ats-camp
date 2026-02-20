import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, previewAsUser, setPreviewAsUser } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-playa-dark">
      {previewAsUser && (
        <div className="w-full bg-orange-600 text-white text-sm flex items-center justify-between px-4 py-2 z-50">
          <span>Admin Preview Mode — viewing as member</span>
          <button
            onClick={() => setPreviewAsUser(false)}
            className="ml-4 px-3 py-1 rounded bg-white/20 hover:bg-white/30 font-medium transition-colors"
          >
            Exit Preview
          </button>
        </div>
      )}
      <Header />
      {user?.role === 'admin' && !previewAsUser && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => setPreviewAsUser(true)}
            className="px-3 py-1.5 rounded-full bg-playa-card border border-playa-border text-xs text-gray-300 hover:text-white hover:border-neon-cyan transition-colors shadow-lg"
          >
            Preview as Member
          </button>
        </div>
      )}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
