import { useState, useEffect, useRef } from 'react';
import { getCurrentCampMap, uploadCampMap } from '../../services/campMap';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/useAuth';
import { CampMap, User } from '../../types';
import { Card, CardContent, Loading, Button } from '../../components/ui';

const UPLOAD_STATUS_KEY = 'mapUploadStatus';
type UploadStatus = 'uploading' | 'error' | null;

// Survives component unmount within the same browser session
let backgroundUpload: Promise<void> | null = null;

export function CampMapPage() {
  const { user, firebaseUser, isAdmin } = useAuth();
  const [campMap, setCampMap] = useState<CampMap | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    mountedRef.current = true;

    // Restore persisted status; clear 'uploading' if no active promise
    // (means the page was hard-refreshed mid-upload)
    const stored = localStorage.getItem(UPLOAD_STATUS_KEY) as UploadStatus;
    if (stored === 'uploading' && !backgroundUpload) {
      localStorage.removeItem(UPLOAD_STATUS_KEY);
    } else {
      setUploadStatus(stored);
    }

    fetchData();

    return () => { mountedRef.current = false; };
  }, []);

  async function fetchData() {
    try {
      const [mapData, usersData] = await Promise.all([
        getCurrentCampMap(),
        getAllUsers(),
      ]);
      if (!mountedRef.current) return;
      setCampMap(mapData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching camp map:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    localStorage.setItem(UPLOAD_STATUS_KEY, 'uploading');
    setUploadStatus('uploading');

    backgroundUpload = uploadCampMap(currentYear, file, firebaseUser.uid)
      .then(() => {
        localStorage.removeItem(UPLOAD_STATUS_KEY);
        backgroundUpload = null;
        if (mountedRef.current) {
          setUploadStatus(null);
          fetchData();
        }
      })
      .catch((error) => {
        console.error('Camp map upload failed:', error);
        localStorage.setItem(UPLOAD_STATUS_KEY, 'error');
        backgroundUpload = null;
        if (mountedRef.current) setUploadStatus('error');
      });
  };

  const dismissError = () => {
    localStorage.removeItem(UPLOAD_STATUS_KEY);
    setUploadStatus(null);
  };

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((u) => u.uid === uid);
  };

  const selectedSpotData = campMap?.spots.find((s) => s.number === selectedSpot);
  const selectedSpotUser = selectedSpotData ? getUserByUid(selectedSpotData.assignedTo) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  const UploadBanner = () => {
    if (!uploadStatus) return null;
    const isError = uploadStatus === 'error';
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-6 ${isError ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-neon-orange/10 border border-neon-orange/30 text-neon-orange'}`}>
        {isError ? (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        <p className="text-sm flex-1">
          {isError
            ? 'Map upload failed. Please try again.'
            : 'Map upload in progress — you can navigate away and it will continue in the background.'}
        </p>
        {isError && (
          <button onClick={dismissError} className="text-red-400 hover:text-red-300 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  if (!campMap) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <UploadBanner />
        <h1 className="text-2xl font-bold text-white mb-4">Camp Map Not Available</h1>
        <p className="text-gray-400 mb-6">
          The camp map for this year hasn't been uploaded yet.{isAdmin ? '' : ' Check back later!'}
        </p>
        {isAdmin && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <Button
              variant="add"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'uploading'}
            >
              {uploadStatus === 'uploading' ? 'Uploading…' : 'Upload Camp Map'}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <UploadBanner />

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Camp Map {campMap.year}</h1>
          <p className="text-gray-400">
            {user?.tentNumber
              ? `Your tent is at spot #${user.tentNumber}`
              : 'Click on a spot to see who is assigned there'}
          </p>
        </div>
        {isAdmin && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'uploading'}
            >
              {uploadStatus === 'uploading' ? 'Uploading…' : 'Replace Map'}
            </Button>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={campMap.imageUrl}
                  alt="Camp Map"
                  className="w-full h-auto rounded-lg"
                />
                {campMap.spots.map((spot) => {
                  const isMySpot = user?.tentNumber === spot.number;
                  const isSelected = selectedSpot === spot.number;
                  const isAssigned = !!spot.assignedTo;

                  return (
                    <button
                      key={spot.number}
                      onClick={() => setSelectedSpot(spot.number)}
                      className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 ${
                        isMySpot
                          ? 'bg-neon-orange text-white glow-orange'
                          : isSelected
                          ? 'bg-neon-purple text-white glow-purple'
                          : isAssigned
                          ? 'bg-playa-card border-2 border-neon-cyan text-neon-cyan'
                          : 'bg-playa-card border border-playa-border text-gray-400'
                      }`}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    >
                      {spot.number}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-neon-orange" />
              <span className="text-gray-400">Your spot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-playa-card border-2 border-neon-cyan" />
              <span className="text-gray-400">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-playa-card border border-playa-border" />
              <span className="text-gray-400">Available</span>
            </div>
          </div>
        </div>

        {/* Spot Info */}
        <div>
          <Card>
            <CardContent>
              {selectedSpot ? (
                <>
                  <h3 className="text-xl font-semibold text-white mb-4">Spot #{selectedSpot}</h3>
                  {selectedSpotUser ? (
                    <div className="flex items-center gap-4">
                      {selectedSpotUser.photoURL ? (
                        <img src={selectedSpotUser.photoURL} alt={selectedSpotUser.displayName} className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-playa-surface flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-400">
                            {selectedSpotUser.displayName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{selectedSpotUser.displayName}</p>
                        {selectedSpotUser.playaName && (
                          <p className="text-neon-purple text-sm">"{selectedSpotUser.playaName}"</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">This spot is not yet assigned</p>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Select a spot on the map to see details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
