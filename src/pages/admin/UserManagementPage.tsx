import { useState, useEffect } from 'react';
import { getAllUsers, setUserRole, assignTentNumber } from '../../services/users';
import { User } from '../../types';
import { Card, CardContent, Button, Input, Loading, Modal } from '../../components/ui';

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tentNumber, setTentNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleRoleChange = async (user: User, newRole: 'member' | 'admin') => {
    try {
      await setUserRole(user.uid, newRole);
      await fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleTentSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const num = tentNumber ? parseInt(tentNumber) : null;
      await assignTentNumber(editingUser.uid, num);
      await fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Error assigning tent:', error);
    } finally {
      setSaving(false);
    }
  };

  const openTentModal = (user: User) => {
    setEditingUser(user);
    setTentNumber(user.tentNumber?.toString() || '');
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.playaName?.toLowerCase().includes(searchLower)
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage camp members, roles, and tent assignments</p>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, email, or playa name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-playa-border">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">User</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Tent #</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Role</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-b border-playa-border/50 hover:bg-playa-surface/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-playa-surface flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-400">
                              {user.displayName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{user.displayName}</p>
                          {user.playaName && (
                            <p className="text-neon-purple text-sm">"{user.playaName}"</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400">{user.email}</td>
                    <td className="py-4 px-4">
                      {user.tentNumber ? (
                        <span className="px-2 py-1 bg-neon-orange/20 text-neon-orange rounded">
                          #{user.tentNumber}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as 'member' | 'admin')}
                        className="px-3 py-1 bg-playa-card border border-playa-border rounded text-gray-200 text-sm focus:outline-none focus:border-neon-cyan"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <Button variant="ghost" size="sm" onClick={() => openTentModal(user)}>
                        Assign Tent
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tent Assignment Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Assign Tent - ${editingUser?.displayName}`}
      >
        <div className="space-y-4">
          <Input
            label="Tent Number"
            type="number"
            placeholder="Enter tent number"
            value={tentNumber}
            onChange={(e) => setTentNumber(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Leave empty to remove tent assignment
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleTentSave} isLoading={saving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
