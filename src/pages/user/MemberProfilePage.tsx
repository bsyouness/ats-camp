import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUser } from '../../services/users';
import { User } from '../../types';
import { Card, CardContent, Loading, Button } from '../../components/ui';

export function MemberProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!uid) return;
      try {
        const data = await getUser(uid);
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Member Not Found</h1>
        <p className="text-gray-400 mb-6">This member profile doesn't exist.</p>
        <Link to="/members">
          <Button variant="secondary">Back to Members</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/members" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Members
      </Link>

      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-playa-surface flex items-center justify-center">
                  <span className="text-4xl font-medium text-gray-400">
                    {user.displayName?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">{user.displayName}</h1>
              {user.playaName && (
                <p className="text-xl text-neon-purple mb-4">"{user.playaName}"</p>
              )}

              {user.tentNumber && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-orange/20 rounded-full mb-4">
                  <svg className="w-4 h-4 text-neon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-neon-orange text-sm font-medium">Tent #{user.tentNumber}</span>
                </div>
              )}

              {user.bio && (
                <p className="text-gray-400 mb-6">{user.bio}</p>
              )}

              {/* Years Attended */}
              {user.yearsAttended && user.yearsAttended.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Burns Attended</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.yearsAttended.sort((a, b) => b - a).map((year) => (
                      <span
                        key={year}
                        className="px-3 py-1 bg-playa-surface text-gray-300 text-sm rounded-full"
                      >
                        {year}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {user.skills && user.skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Skills & Contributions</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {(user.contactInfo?.email || user.contactInfo?.phone) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Contact</h3>
                  <div className="space-y-1">
                    {user.contactInfo.email && (
                      <a
                        href={`mailto:${user.contactInfo.email}`}
                        className="flex items-center gap-2 text-gray-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {user.contactInfo.email}
                      </a>
                    )}
                    {user.contactInfo.phone && (
                      <a
                        href={`tel:${user.contactInfo.phone}`}
                        className="flex items-center gap-2 text-gray-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {user.contactInfo.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
