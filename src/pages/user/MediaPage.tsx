import { useState, useEffect, useRef } from 'react';
import { getAllMedia, uploadMedia, getMediaType, deleteMedia } from '../../services/media';
import { useAuth } from '../../contexts/useAuth';
import { useFileDrop } from '../../hooks/useFileDrop';
import { Media } from '../../types';
import { Card, CardContent, Button, Loading, Modal } from '../../components/ui';

export function MediaPage() {
  const { firebaseUser, isAdmin } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  async function fetchMedia() {
    try {
      const data = await getAllMedia();
      setMedia(data);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFile = (file: File) => {
    if (!firebaseUser) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      alert('Please select an image or video file');
      return;
    }

    setPendingFile(file);
    setDescription('');
    setShowUploadDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const { isDragging, dropProps } = useFileDrop(handleFile, uploading);

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
      await fetchMedia();
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

  const handleDelete = async (mediaItem: Media) => {
    if (!confirm('Are you sure you want to delete this?')) return;

    try {
      await deleteMedia(mediaItem.id, mediaItem.url);
      await fetchMedia();
      setSelectedMedia(null);
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    }
  };

  const years = [...new Set(media.map((m) => m.year))].sort((a, b) => b - a);

  const filteredMedia = filterYear === 'all'
    ? media
    : media.filter((m) => m.year === filterYear);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" {...dropProps}>
      {isDragging && (
        <div className="absolute inset-2 z-20 rounded-xl border-2 border-dashed border-neon-cyan bg-playa-bg/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <p className="text-neon-cyan text-lg font-semibold">Drop photo or video to upload</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Media Gallery</h1>
          <p className="text-gray-400">Photos and videos from the playa</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-4 py-2 bg-playa-card border border-playa-border rounded-lg text-gray-200 focus:outline-none focus:border-neon-cyan"
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-1">
            <Button
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploading}
            >
              {compressing ? 'Compressing...' : uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <p className="text-gray-500 text-xs whitespace-nowrap">or drag a file onto the page</p>
          </div>
        </div>
      </div>

      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400">No media uploaded yet. Be the first to share!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="relative aspect-square bg-playa-card rounded-lg overflow-hidden cursor-pointer group"
            >
              {item.type === 'photo' ? (
                <img
                  src={item.url}
                  alt={item.description || 'Camp photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-playa-surface">
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm">View</span>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                {item.year}
              </div>
            </div>
          ))}
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
            <Button variant="ghost" onClick={() => { setShowUploadDialog(false); setPendingFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUploadConfirm}>Upload</Button>
          </div>
        </div>
      </Modal>

      {/* Media Modal */}
      <Modal
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        size="lg"
      >
        {selectedMedia && (
          <div>
            {selectedMedia.type === 'photo' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.description || 'Camp photo'}
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="w-full rounded-lg"
              />
            )}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-sm">{selectedMedia.year}</span>
              </div>
              {(isAdmin || selectedMedia.uploadedBy === firebaseUser?.uid) && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(selectedMedia)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
