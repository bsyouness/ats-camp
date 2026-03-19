import { useState, useEffect, useCallback } from 'react';
import { getPublishedShifts, signUpForSlot, cancelSlotSignUp } from '../../services/shifts';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, User } from '../../types';
import { Button, Loading, Modal } from '../../components/ui';
import { ShiftCalendar } from '../../components/shifts/ShiftCalendar';
import { ShiftNotes } from '../../components/shifts/ShiftNotes';

export function ShiftsPage() {
  const { firebaseUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const shiftsData = await getPublishedShifts();
      const usersData = await getAllUsers();
      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((user) => user.uid === uid);
  };

  const handleSignUp = async (shiftId: string, slotId: string) => {
    if (!firebaseUser) return;
    setActionLoading(`${shiftId}-${slotId}`);
    try {
      await signUpForSlot(shiftId, slotId, firebaseUser.uid);
      await fetchData();
      const updated = shifts.find((shift) => shift.id === shiftId);
      if (updated) setSelectedShift(updated);
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
      setSelectedShift(null);
    }
  };

  const liveSelectedShift = selectedShift
    ? shifts.find((shift) => shift.id === selectedShift.id) ?? selectedShift
    : null;

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
        <h1 className="text-3xl font-bold text-white mb-2">Camp Shifts</h1>
        <p className="text-gray-400">Sign up for shifts and manage your assignments</p>
      </div>

      <div className="bg-playa-card border border-playa-border rounded-xl p-6 mb-10">
        <ShiftCalendar
          shifts={shifts}
          users={users}
          myUid={firebaseUser?.uid ?? null}
          isAdmin={false}
          onShiftClick={(shift) => setSelectedShift(shift)}
        />
      </div>

      <ShiftNotes />

      <Modal
        isOpen={!!liveSelectedShift}
        onClose={() => setSelectedShift(null)}
        title={liveSelectedShift?.title ?? ''}
        size="md"
      >
        {liveSelectedShift && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span>
                {(liveSelectedShift.date as unknown as { toDate: () => Date })
                  .toDate()
                  .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <span>{liveSelectedShift.startTime} - {liveSelectedShift.endTime}</span>
              {liveSelectedShift.location && <span>{liveSelectedShift.location}</span>}
            </div>

            {liveSelectedShift.description && (
              <p className="text-gray-400 text-sm">{liveSelectedShift.description}</p>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Slots ({liveSelectedShift.slots.filter((slot) => slot.assignedTo).length}/{liveSelectedShift.slots.length} filled)
              </h4>
              <div className="space-y-2">
                {liveSelectedShift.slots.map((slot) => {
                  const assignedUser = getUserByUid(slot.assignedTo);
                  const isMySlot = slot.assignedTo === firebaseUser?.uid;
                  const isOpen = !slot.assignedTo && !slot.preAssigned;
                  const isLoadingSlot = actionLoading === `${liveSelectedShift.id}-${slot.id}`;

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
                            <span className={isMySlot ? 'text-white font-medium' : 'text-gray-300'}>
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

                      <div className="flex gap-2">
                        {isMySlot && !slot.preAssigned && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancel(liveSelectedShift.id, slot.id)}
                            isLoading={isLoadingSlot}
                          >
                            Cancel Slot
                          </Button>
                        )}
                        {isOpen && (
                          <Button
                            size="sm"
                            onClick={() => handleSignUp(liveSelectedShift.id, slot.id)}
                            isLoading={isLoadingSlot}
                          >
                            Sign Up
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
