import { useState, useEffect } from 'react';
import { getAllShifts, signUpForSlot, cancelSlotSignUp } from '../../services/shifts';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Loading } from '../../components/ui';

export function ShiftsPage() {
  const { firebaseUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [shiftsData, usersData] = await Promise.all([
        getAllShifts(),
        getAllUsers(),
      ]);
      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  }

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((u) => u.uid === uid);
  };

  const handleSignUp = async (shiftId: string, slotId: string) => {
    if (!firebaseUser) return;
    setActionLoading(`${shiftId}-${slotId}`);
    try {
      await signUpForSlot(shiftId, slotId, firebaseUser.uid);
      await fetchData();
    } catch (error) {
      console.error('Error signing up:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (shiftId: string, slotId: string) => {
    if (!firebaseUser) return;
    setActionLoading(`${shiftId}-${slotId}`);
    try {
      await cancelSlotSignUp(shiftId, slotId, firebaseUser.uid);
      await fetchData();
    } catch (error) {
      console.error('Error canceling:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">No Shifts Available</h1>
        <p className="text-gray-400">
          There are no shifts scheduled at the moment. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Camp Shifts</h1>
        <p className="text-gray-400">View and sign up for camp duties</p>
      </div>

      <div className="space-y-6">
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <CardTitle>{shift.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatDate(shift.date as { toDate: () => Date })}</span>
                  <span>{shift.startTime} - {shift.endTime}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shift.description && (
                <p className="text-gray-400 mb-4">{shift.description}</p>
              )}
              {shift.location && (
                <p className="text-sm text-gray-500 mb-4">
                  <span className="text-gray-400">Location:</span> {shift.location}
                </p>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">
                  Slots ({shift.slots.filter((s) => s.assignedTo).length}/{shift.slots.length} filled)
                </h4>
                {shift.slots.map((slot) => {
                  const assignedUser = getUserByUid(slot.assignedTo);
                  const isMySlot = slot.assignedTo === firebaseUser?.uid;
                  const isOpen = !slot.assignedTo && !slot.preAssigned;
                  const isLoading = actionLoading === `${shift.id}-${slot.id}`;

                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isMySlot
                          ? 'bg-neon-orange/20 border border-neon-orange/50'
                          : 'bg-playa-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {assignedUser ? (
                          <>
                            {assignedUser.photoURL ? (
                              <img
                                src={assignedUser.photoURL}
                                alt={assignedUser.displayName}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-playa-card flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-400">
                                  {assignedUser.displayName?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className={isMySlot ? 'text-white' : 'text-gray-300'}>
                              {isMySlot ? 'You' : assignedUser.displayName}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-playa-card border border-dashed border-playa-border flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <span className="text-gray-500">Open slot</span>
                          </>
                        )}
                        {slot.preAssigned && (
                          <span className="px-2 py-0.5 bg-playa-card text-gray-500 text-xs rounded">
                            Pre-assigned
                          </span>
                        )}
                      </div>

                      {isMySlot && !slot.preAssigned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(shift.id, slot.id)}
                          isLoading={isLoading}
                        >
                          Cancel
                        </Button>
                      )}

                      {isOpen && (
                        <Button
                          size="sm"
                          onClick={() => handleSignUp(shift.id, slot.id)}
                          isLoading={isLoading}
                        >
                          Sign Up
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
