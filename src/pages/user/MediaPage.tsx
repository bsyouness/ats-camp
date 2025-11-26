import { useState, useEffect, useRef } from 'react';
import { getAllMedia, uploadMedia, getMediaType, deleteMedia } from '../../services/media';
import { useAuth } from '../../contexts/AuthContext';
import { Media } from '../../types';
import { Card, CardContent, Button, Loading, Modal } from '../../components/ui';

export function MediaPage() {
  const { firebaseUser, isAdmin } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      alert('Please select an image or video file');
      return;
    }

    setUploading(true);
    try {
      await uploadMedia({
        file,
        type: mediaType,
        description: '',
        year: new Date().getFullYear(),
        uploadedBy: firebaseUser.uid,
      });
      await fetchMedia();
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <Button
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploading}
          >
            Upload
          </Button>
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
              <span className="text-gray-400 text-sm">{selectedMedia.year}</span>
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
