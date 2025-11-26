import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUser } from '../../services/users';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';

export function MyProfilePage() {
  const { user, firebaseUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [playaName, setPlayaName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [yearsAttended, setYearsAttended] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPlayaName(user.playaName || '');
      setBio(user.bio || '');
      setSkills(user.skills?.join(', ') || '');
      setContactEmail(user.contactInfo?.email || '');
      setContactPhone(user.contactInfo?.phone || '');
      setYearsAttended(user.yearsAttended?.join(', ') || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const yearsArray = yearsAttended
        .split(',')
        .map((y) => parseInt(y.trim()))
        .filter((y) => !isNaN(y));

      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await updateUser(firebaseUser.uid, {
        displayName,
        playaName: playaName || null,
        bio: bio || null,
        skills: skillsArray,
        contactInfo: {
          email: contactEmail || undefined,
          phone: contactPhone || undefined,
        },
        yearsAttended: yearsArray,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-gray-400">Update your camp profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Display Name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            <Input
              label="Playa Name (optional)"
              placeholder="Your playa name"
              value={playaName}
              onChange={(e) => setPlayaName(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Bio
              </label>
              <textarea
                className="w-full px-4 py-2.5 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors min-h-[100px] resize-y"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Burning Man Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Years Attended"
              placeholder="2019, 2022, 2023"
              value={yearsAttended}
              onChange={(e) => setYearsAttended(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Enter years separated by commas
            </p>

            <Input
              label="Skills / Contributions"
              placeholder="DJ, cooking, building, art"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Enter skills separated by commas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">
              This information will be visible to other camp members
            </p>

            <Input
              type="email"
              label="Contact Email"
              placeholder="contact@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />

            <Input
              type="tel"
              label="Phone Number"
              placeholder="+1 555 123 4567"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {success && (
          <p className="text-green-400 text-sm">Profile updated successfully!</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
