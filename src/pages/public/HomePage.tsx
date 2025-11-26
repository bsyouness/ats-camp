import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

export function HomePage() {
  const { firebaseUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-orange/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-neon-orange/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent">
              ATS Camp
            </span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Building community, creating magic, and burning together since the beginning.
            Join us in the dust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {firebaseUser ? (
              <Link to="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg">Join the Camp</Button>
                </Link>
                <Link to="/about">
                  <Button variant="secondary" size="lg">Learn More</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-playa-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Camp Member Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-playa-card border border-playa-border rounded-xl p-6 hover:border-neon-orange/50 transition-colors">
              <div className="w-12 h-12 bg-neon-orange/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-neon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Camp Map</h3>
              <p className="text-gray-400">
                Find your tent location and navigate the camp with our interactive map.
              </p>
            </div>

            <div className="bg-playa-card border border-playa-border rounded-xl p-6 hover:border-neon-purple/50 transition-colors">
              <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Shift Schedule</h3>
              <p className="text-gray-400">
                Sign up for camp duties and keep track of your shift schedule.
              </p>
            </div>

            <div className="bg-playa-card border border-playa-border rounded-xl p-6 hover:border-neon-cyan/50 transition-colors">
              <div className="w-12 h-12 bg-neon-cyan/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Member Directory</h3>
              <p className="text-gray-400">
                Connect with fellow camp members and view their profiles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join?
          </h2>
          <p className="text-gray-400 mb-8">
            Get access to all camp resources, connect with members, and be part of our Burning Man community.
          </p>
          {!firebaseUser && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg">Create Account</Button>
              </Link>
              <Link to="/join-whatsapp">
                <Button variant="secondary" size="lg">Join WhatsApp</Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
