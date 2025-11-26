import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers } from '../../services/users';
import { User } from '../../types';
import { Card, CardContent, Input, Loading } from '../../components/ui';

export function MembersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.playaName?.toLowerCase().includes(searchLower) ||
      user.skills?.some((skill) => skill.toLowerCase().includes(searchLower))
    );
  });

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
        <h1 className="text-3xl font-bold text-white mb-2">Camp Members</h1>
        <p className="text-gray-400">Browse and connect with fellow camp members</p>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, playa name, or skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Link key={user.uid} to={`/members/${user.uid}`}>
            <Card hover className="h-full">
              <CardContent>
                <div className="flex items-start gap-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-playa-surface flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-400">
                        {user.displayName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {user.displayName}
                    </h3>
                    {user.playaName && (
                      <p className="text-neon-purple text-sm">"{user.playaName}"</p>
                    )}
                    {user.yearsAttended && user.yearsAttended.length > 0 && (
                      <p className="text-gray-500 text-sm mt-1">
                        {user.yearsAttended.length} burn{user.yearsAttended.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {user.skills && user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-playa-surface text-gray-400 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {user.skills.length > 3 && (
                          <span className="px-2 py-0.5 text-gray-500 text-xs">
                            +{user.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No members found matching your search.</p>
        </div>
      )}
    </div>
  );
}
