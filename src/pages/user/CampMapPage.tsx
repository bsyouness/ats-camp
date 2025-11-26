import { useState, useEffect } from 'react';
import { getCurrentCampMap } from '../../services/campMap';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { CampMap, User } from '../../types';
import { Card, CardContent, Loading } from '../../components/ui';

export function CampMapPage() {
  const { user } = useAuth();
  const [campMap, setCampMap] = useState<CampMap | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [mapData, usersData] = await Promise.all([
          getCurrentCampMap(),
          getAllUsers(),
        ]);
        setCampMap(mapData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching camp map:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  if (!campMap) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Camp Map Not Available</h1>
        <p className="text-gray-400">
          The camp map for this year hasn't been uploaded yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Camp Map {campMap.year}</h1>
        <p className="text-gray-400">
          {user?.tentNumber
            ? `Your tent is at spot #${user.tentNumber}`
            : 'Click on a spot to see who is assigned there'}
        </p>
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
                {/* Spot markers */}
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
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                      }}
                    >
                      {spot.number}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
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
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Spot #{selectedSpot}
                  </h3>
                  {selectedSpotUser ? (
                    <div className="flex items-center gap-4">
                      {selectedSpotUser.photoURL ? (
                        <img
                          src={selectedSpotUser.photoURL}
                          alt={selectedSpotUser.displayName}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-playa-surface flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-400">
                            {selectedSpotUser.displayName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {selectedSpotUser.displayName}
                        </p>
                        {selectedSpotUser.playaName && (
                          <p className="text-neon-purple text-sm">
                            "{selectedSpotUser.playaName}"
                          </p>
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
