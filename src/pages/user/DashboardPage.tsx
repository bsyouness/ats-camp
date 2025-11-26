import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';

export function DashboardPage() {
  const { user } = useAuth();

  const quickLinks = [
    {
      title: 'Camp Map',
      description: 'View camp layout and find your spot',
      href: '/map',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      color: 'neon-orange',
    },
    {
      title: 'Shifts',
      description: 'View and sign up for camp duties',
      href: '/shifts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'neon-purple',
    },
    {
      title: 'Members',
      description: 'Browse camp member profiles',
      href: '/members',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'neon-cyan',
    },
    {
      title: 'Media',
      description: 'Browse and upload camp photos',
      href: '/media',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'neon-orange',
    },
    {
      title: 'Resources',
      description: 'Camp dues, Notion, and more',
      href: '/resources',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'neon-purple',
    },
    {
      title: 'My Profile',
      description: 'Update your profile information',
      href: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'neon-cyan',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.displayName || 'Burner'}!
        </h1>
        <p className="text-gray-400">
          {user?.tentNumber
            ? `Your tent number is #${user.tentNumber}`
            : 'Your tent assignment is pending'}
        </p>
      </div>

      {/* Quick Links Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card hover className="h-full">
              <CardContent className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-${link.color}/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-${link.color}`}>{link.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{link.title}</h3>
                  <p className="text-gray-400 text-sm">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Profile Completion Card */}
      {(!user?.bio || !user?.playaName || user?.yearsAttended?.length === 0) && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Help other camp members get to know you by completing your profile.
            </p>
            <div className="flex flex-wrap gap-2">
              {!user?.playaName && (
                <span className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400">
                  Add playa name
                </span>
              )}
              {!user?.bio && (
                <span className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400">
                  Add bio
                </span>
              )}
              {(!user?.yearsAttended || user.yearsAttended.length === 0) && (
                <span className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400">
                  Add years attended
                </span>
              )}
            </div>
            <Link
              to="/profile"
              className="inline-block mt-4 text-neon-cyan hover:underline text-sm"
            >
              Edit profile &rarr;
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
