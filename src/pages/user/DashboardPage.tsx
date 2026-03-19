import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { getAllContacts } from '../../services/contacts';
import { getPublishedShifts } from '../../services/shifts';
import { Shift } from '../../types';

type DashboardLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string | null;
  highlight?: boolean;
};

export function DashboardPage() {
  const { user, firebaseUser, isAdmin } = useAuth();
  const [stats, setStats] = useState({ pendingContacts: 0 });
  const [myShifts, setMyShifts] = useState<Shift[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    getAllContacts().then((contacts) => {
      setStats({ pendingContacts: contacts.filter((c) => !c.handled).length });
    }).catch(console.error);
  }, [isAdmin]);

  useEffect(() => {
    if (!firebaseUser) return;
    getPublishedShifts()
      .then((shifts) => {
        const assigned = shifts
          .filter((shift) => shift.slots.some((slot) => slot.assignedTo === firebaseUser.uid))
          .sort((a, b) => {
            const aDate = (a.date as unknown as { toDate: () => Date }).toDate().getTime();
            const bDate = (b.date as unknown as { toDate: () => Date }).toDate().getTime();
            return aDate - bDate || a.startTime.localeCompare(b.startTime);
          });
        setMyShifts(assigned);
      })
      .catch(console.error);
  }, [firebaseUser]);

  const commonLinks: DashboardLink[] = [
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
      title: isAdmin ? 'User Management' : 'Members',
      description: isAdmin ? 'Manage users, roles, and tent assignments' : 'Browse camp member profiles',
      href: isAdmin ? '/admin/users' : '/members',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'neon-cyan',
    },
    {
      title: isAdmin ? 'Media Management' : 'Media',
      description: isAdmin ? 'Moderate and manage uploaded photos' : 'Browse and upload camp photos',
      href: isAdmin ? '/admin/media' : '/media',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'neon-orange',
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
      color: 'neon-purple',
    },
  ];

  const adminLinks: DashboardLink[] = [
    {
      title: 'Contact Submissions',
      description: 'View contact form submissions',
      href: '/admin/contacts',
      badge: stats.pendingContacts > 0 ? `${stats.pendingContacts} pending` : null,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'neon-orange',
      highlight: stats.pendingContacts > 0,
    },
  ];

  const links = isAdmin ? [...commonLinks, ...adminLinks] : commonLinks;

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
        {links.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card hover className={`h-full ${link.highlight ? 'border-neon-orange' : ''}`}>
              <CardContent className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-${link.color}/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-${link.color}`}>{link.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{link.title}</h3>
                    {link.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${link.highlight ? 'bg-neon-orange/20 text-neon-orange' : 'bg-playa-surface text-gray-400'}`}>
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Profile Completion Card */}
      {(!user?.bio && !user?.playaName && (!user?.yearsAttended || user.yearsAttended.length === 0)) && (
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
                <Link
                  to="/profile#field-playa-name"
                  className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/30 transition-colors"
                >
                  + Add playa name
                </Link>
              )}
              {!user?.bio && (
                <Link
                  to="/profile#field-bio"
                  className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/30 transition-colors"
                >
                  + Add bio
                </Link>
              )}
              {(!user?.yearsAttended || user.yearsAttended.length === 0) && (
                <Link
                  to="/profile#field-years-attended"
                  className="px-3 py-1 bg-playa-surface rounded-full text-sm text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/30 transition-colors"
                >
                  + Add years attended
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>My Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {myShifts.length === 0 ? (
            <p className="text-gray-400">
              You are not assigned to any published shifts yet. <Link to="/shifts" className="text-neon-cyan hover:underline">Browse open shifts</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {myShifts.slice(0, 5).map((shift) => {
                const shiftDate = (shift.date as unknown as { toDate: () => Date }).toDate();
                return (
                  <Link
                    key={shift.id}
                    to="/shifts"
                    className="block rounded-lg border border-playa-border bg-playa-surface px-4 py-3 hover:border-neon-cyan/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{shift.title}</p>
                        <p className="text-sm text-gray-400">
                          {shiftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {' · '}
                          {shift.startTime}–{shift.endTime}
                          {shift.location ? ` · ${shift.location}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-neon-cyan">View</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
