import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers } from '../../services/users';
import { getAllShifts } from '../../services/shifts';
import { getAllMedia } from '../../services/media';
import { getAllContacts } from '../../services/contacts';
import { Card, CardContent, CardHeader, CardTitle, Loading } from '../../components/ui';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    shifts: 0,
    media: 0,
    pendingContacts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [users, shifts, media, contacts] = await Promise.all([
          getAllUsers(),
          getAllShifts(),
          getAllMedia(),
          getAllContacts(),
        ]);

        setStats({
          users: users.length,
          shifts: shifts.length,
          media: media.length,
          pendingContacts: contacts.filter((c) => !c.handled).length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const adminLinks = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and tent assignments',
      href: '/admin/users',
      stat: stats.users,
      statLabel: 'users',
      color: 'neon-orange',
    },
    {
      title: 'Camp Map',
      description: 'Upload map and manage spot assignments',
      href: '/admin/map',
      color: 'neon-purple',
    },
    {
      title: 'Shift Management',
      description: 'Create and manage camp shifts',
      href: '/admin/shifts',
      stat: stats.shifts,
      statLabel: 'shifts',
      color: 'neon-cyan',
    },
    {
      title: 'Media Management',
      description: 'Moderate uploaded photos and videos',
      href: '/admin/media',
      stat: stats.media,
      statLabel: 'items',
      color: 'neon-orange',
    },
    {
      title: 'Contact Submissions',
      description: 'View messages and WhatsApp requests',
      href: '/admin/contacts',
      stat: stats.pendingContacts,
      statLabel: 'pending',
      color: 'neon-purple',
      highlight: stats.pendingContacts > 0,
    },
    {
      title: 'Site Configuration',
      description: 'Edit links and site settings',
      href: '/admin/config',
      color: 'neon-cyan',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage your camp website</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card hover className={`h-full ${link.highlight ? 'border-neon-orange' : ''}`}>
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-3">{link.description}</p>
                {link.stat !== undefined && (
                  <p className={`text-2xl font-bold text-${link.color}`}>
                    {link.stat} <span className="text-sm text-gray-500">{link.statLabel}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
