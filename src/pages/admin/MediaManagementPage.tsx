import { useState, useEffect, useRef } from 'react';
import { getAllMedia, deleteMedia, getMediaType, uploadMedia } from '../../services/media';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/useAuth';
import { Media, User } from '../../types';
import { Card, CardContent, Button, Loading, Modal } from '../../components/ui';

export function MediaManagementPage() {
  const { firebaseUser } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [mediaResult, usersResult] = await Promise.allSettled([
      getAllMedia(),
      getAllUsers(),
    ]);

    if (mediaResult.status === 'fulfilled') {
      setMedia(mediaResult.value);
    } else {
      console.error('Error fetching media:', mediaResult.reason);
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value);
    } else {
      console.error('Error fetching users:', usersResult.reason);
    }

    setLoading(false);
  }

  const handleDelete = async (mediaItem: Media) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    setDeleting(true);
    try {
      await deleteMedia(mediaItem.id, mediaItem.url);
      await fetchData();
      setSelectedMedia(null);
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      alert('Please select an image or video file');
      return;
    }

    setPendingFile(file);
    setDescription('');
    setShowUploadDialog(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile || !firebaseUser) return;

    const mediaType = getMediaType(pendingFile)!;
    setShowUploadDialog(false);

    if (mediaType === 'photo') setCompressing(true);
    setUploading(true);

    try {
      await uploadMedia({
        file: pendingFile,
        type: mediaType,
        description,
        year: new Date().getFullYear(),
        uploadedBy: firebaseUser.uid,
      });
      await fetchData();
    } catch (error) {
      console.error('Error uploading media:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload media');
    } finally {
      setUploading(false);
      setCompressing(false);
      setPendingFile(null);
      setDescription('');
    }
  };

  const getUserByUid = (uid: string) => {
    return users.find((u) => u.uid === uid);
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Media Management</h1>
          <p className="text-gray-400">Moderate and manage uploaded media ({media.length} items)</p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploading}
          >
            {compressing ? 'Compressing...' : uploading ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400">No media uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item) => {
            const uploader = getUserByUid(item.uploadedBy);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group relative aspect-square bg-playa-card rounded-lg overflow-hidden cursor-pointer"
              >
                {item.type === 'photo' ? (
                  <img
                    src={item.url}
                    alt={item.description || 'Media'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-playa-surface">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                  <p className="text-white text-sm font-medium truncate w-full text-center">
                    {uploader?.displayName || 'Unknown'}
                  </p>
                  <p className="text-gray-300 text-xs">{item.year}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Modal
        isOpen={showUploadDialog}
        onClose={() => { setShowUploadDialog(false); setPendingFile(null); }}
        size="sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Upload media</h2>
          {pendingFile && (
            <p className="text-sm text-gray-400 mb-4 truncate">{pendingFile.name}</p>
          )}
          <label className="block text-sm text-gray-300 mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a caption..."
            className="w-full px-3 py-2 bg-playa-surface border border-playa-border rounded-lg text-gray-200 focus:outline-none focus:border-neon-cyan mb-6"
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => { setShowUploadDialog(false); setPendingFile(null); }}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadConfirm}>Upload</Button>
          </div>
        </div>
      </Modal>

      {/* Media Detail Modal */}
      <Modal
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        title="Media Details"
        size="lg"
      >
        {selectedMedia && (
          <div className="space-y-4">
            {selectedMedia.type === 'photo' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.description || 'Media'}
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="w-full rounded-lg"
              />
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Uploaded by</p>
                <p className="text-white">
                  {getUserByUid(selectedMedia.uploadedBy)?.displayName || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Year</p>
                <p className="text-white">{selectedMedia.year}</p>
              </div>
              <div>
                <p className="text-gray-500">Type</p>
                <p className="text-white capitalize">{selectedMedia.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Uploaded</p>
                <p className="text-white">
                  {formatDate(selectedMedia.uploadedAt as { toDate: () => Date })}
                </p>
              </div>
            </div>

            {selectedMedia.description && (
              <div>
                <p className="text-gray-500 text-sm">Description</p>
                <p className="text-white">{selectedMedia.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="danger"
                onClick={() => handleDelete(selectedMedia)}
                isLoading={deleting}
              >
                Delete Media
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
