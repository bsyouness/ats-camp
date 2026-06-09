import { useState, FormEvent, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/useAuth';
import { updateUser } from '../../services/users';
import { getMyMedia, compressImage } from '../../services/media';
import { storage } from '../../services/firebase';
import { withTimeout } from '../../services/async';
import { useFileDrop } from '../../hooks/useFileDrop';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Loading, Modal } from '../../components/ui';
import { LoginMethod, Media } from '../../types';

const AVATAR_UPLOAD_TIMEOUT_MS = 15000;

// ── Avatar component ──────────────────────────────────────────────────────────

function Avatar({
  photoURL,
  displayName,
  onEditClick,
}: {
  photoURL: string | null;
  displayName: string;
  onEditClick: () => void;
}) {
  const initial = (displayName || '?').charAt(0).toUpperCase();

  return (
    <div className="relative w-24 h-24 mx-auto">
      {photoURL ? (
        <img
          src={photoURL}
          alt={displayName}
          className="w-24 h-24 rounded-full object-cover border-2 border-playa-border"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-playa-card border-2 border-playa-border flex items-center justify-center">
          <span className="text-3xl font-semibold text-gray-200">{initial}</span>
        </div>
      )}

      {/* Edit button */}
      <button
        type="button"
        onClick={onEditClick}
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-playa-surface border border-playa-border flex items-center justify-center text-gray-400 hover:text-white hover:border-neon-cyan transition-colors shadow-lg"
        title="Change photo"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
        </svg>
      </button>
    </div>
  );
}

// ── Photo picker modal ────────────────────────────────────────────────────────

function PhotoPickerModal({
  isOpen,
  onClose,
  uid,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onSave: (url: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<'upload' | 'gallery'>('upload');
  const [galleryMedia, setGalleryMedia] = useState<Media[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load gallery when switching to that tab
  useEffect(() => {
    if (tab === 'gallery' && galleryMedia.length === 0) {
      setGalleryLoading(true);
      getMyMedia(uid)
        .then((items) => setGalleryMedia(items.filter((m) => m.type === 'photo')))
        .catch(console.error)
        .finally(() => setGalleryLoading(false));
    }
  }, [tab, uid, galleryMedia.length]);

  function handleClose() {
    setPreview(null);
    setPendingFile(null);
    setError('');
    setTab('upload');
    onClose();
  }

  function selectFile(file: File) {
    setError('');
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const { isDragging, dropProps } = useFileDrop(selectFile, saving);

  async function handleUploadConfirm() {
    if (!pendingFile) return;
    setSaving(true);
    setError('');
    try {
      const compressed = await compressImage(pendingFile);
      const storageRef = ref(storage, `avatars/${uid}-${Date.now()}.jpg`);
      await withTimeout(
        uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' }),
        AVATAR_UPLOAD_TIMEOUT_MS,
        'Profile photo upload timed out. Storage may not be set up yet.',
      );
      const url = await withTimeout(
        getDownloadURL(storageRef),
        AVATAR_UPLOAD_TIMEOUT_MS,
        'Profile photo URL lookup timed out. Please try again.',
      );
      await withTimeout(
        onSave(url),
        AVATAR_UPLOAD_TIMEOUT_MS,
        'Profile photo save timed out. Please try again.',
      );
      handleClose();
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload profile photo. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGallerySelect(url: string) {
    setSaving(true);
    setError('');
    try {
      await onSave(url);
      handleClose();
    } catch (err) {
      console.error('Avatar update failed:', err);
      setError('Failed to update profile photo. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change profile photo" size="md">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-playa-card rounded-lg">
        {(['upload', 'gallery'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-playa-surface text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'upload' ? 'Upload new' : 'From gallery'}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === 'upload' && (
        <div
          className={`flex flex-col items-center gap-4 rounded-lg p-4 transition-colors ${
            isDragging ? 'bg-neon-cyan/10 ring-2 ring-neon-cyan' : ''
          }`}
          {...dropProps}
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover border-2 border-playa-border"
            />
          ) : (
            <div className={`w-32 h-32 rounded-full bg-playa-card border-2 border-dashed flex items-center justify-center text-gray-500 ${
              isDragging ? 'border-neon-cyan' : 'border-playa-border'
            }`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {isDragging ? 'Drop photo here' : preview ? 'Choose different photo' : 'Choose photo'}
          </Button>

          {preview && (
            <>
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              <Button
                type="button"
                onClick={handleUploadConfirm}
                isLoading={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Set as profile photo'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Gallery tab */}
      {tab === 'gallery' && (
        <div>
          {galleryLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="md" />
            </div>
          ) : galleryMedia.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              No photos uploaded yet. Upload one from the Media page first.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {galleryMedia.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleGallerySelect(item.url)}
                  disabled={saving}
                  className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-neon-cyan transition-colors focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                >
                  <img
                    src={item.url}
                    alt={item.description || 'Gallery photo'}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          {saving && (
            <div className="flex justify-center pt-4">
              <Loading size="sm" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MyProfilePage() {
  const { user, firebaseUser } = useAuth();
  const { hash } = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [playaName, setPlayaName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [yearsAttended, setYearsAttended] = useState('');

  const getLoginMethodLabel = (method: LoginMethod | undefined) => {
    switch (method) {
      case 'email':
        return 'Email and password';
      case 'google':
        return 'Google';
      case 'hubid':
        return 'Hub Culture';
      default:
        return 'Not recorded yet';
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPlayaName(user.playaName || '');
      setBio(user.bio || '');
      setSkills(user.skills?.join(', ') || '');
      setContactEmail(user.contactInfo?.email || '');
      setContactPhone(user.contactInfo?.phone || '');
      setYearsAttended(user.yearsAttended?.join(', ') || '');
      setCurrentPhotoURL(user.photoURL || firebaseUser?.photoURL || null);
    }
  }, [user, firebaseUser]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }, [hash, user]);

  async function handlePhotoSave(url: string) {
    if (!firebaseUser) return;
    await updateUser(firebaseUser.uid, { photoURL: url });
    await updateProfile(firebaseUser, { photoURL: url });
    setCurrentPhotoURL(url);
  }

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

      await updateProfile(firebaseUser, { displayName });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Profile update failed:', err);
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

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8 gap-2">
        <Avatar
          photoURL={currentPhotoURL}
          displayName={displayName || firebaseUser?.displayName || ''}
          onEditClick={() => setShowPhotoPicker(true)}
        />
        <span className="text-xs text-gray-500">Click the pencil to change your photo</span>
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
              id="field-playa-name"
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
                id="field-bio"
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
            <CardTitle>Login Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-playa-border bg-playa-card px-4 py-3">
              <p className="text-sm text-gray-400 mb-1">This account is tied to:</p>
              <p className="text-white font-medium">{getLoginMethodLabel(user?.loginMethod)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Burning Man Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="field-years-attended"
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

      {firebaseUser && (
        <PhotoPickerModal
          isOpen={showPhotoPicker}
          onClose={() => setShowPhotoPicker(false)}
          uid={firebaseUser.uid}
          onSave={handlePhotoSave}
        />
      )}
    </div>
  );
}
