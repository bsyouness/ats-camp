import { useState, useEffect, useRef } from 'react';
import { getCurrentCampMap, uploadCampMap, updateCampMapSpots } from '../../services/campMap';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { CampMap, CampSpot, User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Loading } from '../../components/ui';

export function MapManagementPage() {
  const { firebaseUser } = useAuth();
  const [campMap, setCampMap] = useState<CampMap | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<CampSpot | null>(null);
  const [spots, setSpots] = useState<CampSpot[]>([]);
  const [nextSpotNumber, setNextSpotNumber] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [mapData, usersData] = await Promise.all([
        getCurrentCampMap(),
        getAllUsers(),
      ]);
      setCampMap(mapData);
      setUsers(usersData);
      if (mapData) {
        setSpots(mapData.spots);
        const maxNumber = Math.max(0, ...mapData.spots.map((s) => s.number));
        setNextSpotNumber(maxNumber + 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    setUploading(true);
    try {
      await uploadCampMap(currentYear, file, firebaseUser.uid);
      await fetchData();
    } catch (error) {
      console.error('Error uploading map:', error);
      alert('Failed to upload map');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newSpot: CampSpot = {
      number: nextSpotNumber,
      x,
      y,
      assignedTo: null,
    };

    setSpots([...spots, newSpot]);
    setNextSpotNumber(nextSpotNumber + 1);
  };

  const handleSpotClick = (spot: CampSpot, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSpot(spot);
  };

  const handleSpotDelete = (spotNumber: number) => {
    setSpots(spots.filter((s) => s.number !== spotNumber));
    setSelectedSpot(null);
  };

  const handleSpotAssign = (userId: string | null) => {
    if (!selectedSpot) return;
    setSpots(
      spots.map((s) =>
        s.number === selectedSpot.number ? { ...s, assignedTo: userId } : s
      )
    );
    setSelectedSpot({ ...selectedSpot, assignedTo: userId });
  };

  const handleSaveSpots = async () => {
    if (!campMap) return;
    setSaving(true);
    try {
      await updateCampMapSpots(campMap.year, spots);
      alert('Spots saved successfully!');
    } catch (error) {
      console.error('Error saving spots:', error);
      alert('Failed to save spots');
    } finally {
      setSaving(false);
    }
  };

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((u) => u.uid === uid);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Camp Map Management</h1>
        <p className="text-gray-400">Upload map and define tent spots for {currentYear}</p>
      </div>

      {!campMap ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400 mb-6">No map uploaded for {currentYear} yet.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
              Upload Camp Map
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Editor */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Map Editor</CardTitle>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={uploading}
                    >
                      Replace Map
                    </Button>
                    <Button size="sm" onClick={handleSaveSpots} isLoading={saving}>
                      Save Spots
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <p className="px-6 pb-4 text-sm text-gray-400">
                  Click on the map to add spots. Click a spot to select it.
                </p>
                <div className="relative cursor-crosshair">
                  <img
                    ref={imageRef}
                    src={campMap.imageUrl}
                    alt="Camp Map"
                    className="w-full h-auto"
                    onClick={handleImageClick}
                  />
                  {spots.map((spot) => (
                    <button
                      key={spot.number}
                      onClick={(e) => handleSpotClick(spot, e)}
                      className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 ${
                        selectedSpot?.number === spot.number
                          ? 'bg-neon-purple text-white glow-purple'
                          : spot.assignedTo
                          ? 'bg-neon-orange text-white'
                          : 'bg-playa-card border border-playa-border text-gray-400'
                      }`}
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                      }}
                    >
                      {spot.number}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spot Editor Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Spot Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSpot ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-white">Spot #{selectedSpot.number}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Assign to User
                      </label>
                      <select
                        value={selectedSpot.assignedTo || ''}
                        onChange={(e) => handleSpotAssign(e.target.value || null)}
                        className="w-full px-4 py-2.5 bg-playa-card border border-playa-border rounded-lg text-gray-200 focus:outline-none focus:border-neon-cyan"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {user.displayName} {user.playaName ? `"${user.playaName}"` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSpot.assignedTo && (
                      <div className="p-3 bg-playa-surface rounded-lg">
                        <p className="text-sm text-gray-400">Currently assigned to:</p>
                        <p className="text-white font-medium">
                          {getUserByUid(selectedSpot.assignedTo)?.displayName}
                        </p>
                      </div>
                    )}

                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => handleSpotDelete(selectedSpot.number)}
                    >
                      Delete Spot
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-400">
                    Select a spot on the map to edit it, or click on the map to add a new spot.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Spots Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Spots Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {spots.length === 0 ? (
                    <p className="text-gray-500 text-sm">No spots defined yet</p>
                  ) : (
                    spots
                      .sort((a, b) => a.number - b.number)
                      .map((spot) => {
                        const assignedUser = getUserByUid(spot.assignedTo);
                        return (
                          <div
                            key={spot.number}
                            onClick={() => setSelectedSpot(spot)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                              selectedSpot?.number === spot.number
                                ? 'bg-neon-purple/20'
                                : 'hover:bg-playa-surface'
                            }`}
                          >
                            <span className="text-gray-300">#{spot.number}</span>
                            <span className="text-gray-500 text-sm truncate max-w-[150px]">
                              {assignedUser?.displayName || 'Unassigned'}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
