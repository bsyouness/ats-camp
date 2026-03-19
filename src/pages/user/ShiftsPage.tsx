import { useState, useEffect, useCallback } from 'react';
import { getPublishedShifts, signUpForSlot, cancelSlotSignUp } from '../../services/shifts';
import { getAllUsers } from '../../services/users';
import { createShiftRequest, getUserShiftRequests } from '../../services/shiftRequests';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, ShiftRequest, User } from '../../types';
import { Button, Loading, Modal } from '../../components/ui';
import { ShiftCalendar } from '../../components/shifts/ShiftCalendar';
import { ShiftNotes } from '../../components/shifts/ShiftNotes';

export function ShiftsPage() {
  const { firebaseUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Shift detail modal
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Change request modal
  const [requestMode, setRequestMode] = useState<'change' | 'cancel' | null>(null);
  const [requestSlotId, setRequestSlotId] = useState<string | null>(null);
  const [targetShiftId, setTargetShiftId] = useState('');
  const [targetSlotId, setTargetSlotId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const [shiftsData, usersData, requestsData] = await Promise.all([
        getPublishedShifts(),
        getAllUsers(),
        getUserShiftRequests(firebaseUser.uid),
      ]);
      setShifts(shiftsData);
      setUsers(usersData);
      setMyRequests(requestsData);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((u) => u.uid === uid);
  };

  const getShiftById = (id: string | null) =>
    id ? shifts.find((s) => s.id === id) ?? null : null;

  const handleSignUp = async (shiftId: string, slotId: string) => {
    if (!firebaseUser) return;
    setActionLoading(`${shiftId}-${slotId}`);
    try {
      await signUpForSlot(shiftId, slotId, firebaseUser.uid);
      await fetchData();
      // Refresh selected shift
      const updated = shifts.find((s) => s.id === shiftId);
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

  const openRequestModal = (mode: 'change' | 'cancel', slotId: string) => {
    setRequestMode(mode);
    setRequestSlotId(slotId);
    setTargetShiftId('');
    setTargetSlotId('');
    setRequestMessage('');
  };

  const handleSubmitRequest = async () => {
    if (!firebaseUser || !selectedShift || !requestSlotId || !requestMode) return;
    setSubmitting(true);
    try {
      await createShiftRequest({
        userId: firebaseUser.uid,
        type: requestMode === 'change' ? 'change_request' : 'cancel_request',
        shiftId: selectedShift.id,
        slotId: requestSlotId,
        targetShiftId: requestMode === 'change' ? targetShiftId || null : null,
        targetSlotId: requestMode === 'change' ? targetSlotId || null : null,
        message: requestMessage,
      });
      await fetchData();
      setRequestMode(null);
      setSelectedShift(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTs = (ts: { toDate: () => Date } | null) => {
    if (!ts) return '';
    return ts.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const targetShift = getShiftById(targetShiftId || null);

  // Refresh selected shift from latest data
  const liveSelectedShift = selectedShift
    ? shifts.find((s) => s.id === selectedShift.id) ?? selectedShift
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

      {/* Calendar */}
      <div className="bg-playa-card border border-playa-border rounded-xl p-6 mb-10">
        <ShiftCalendar
          shifts={shifts}
          users={users}
          myUid={firebaseUser?.uid ?? null}
          isAdmin={false}
          onShiftClick={(shift) => setSelectedShift(shift)}
        />
      </div>

      {/* Shift Notes */}
      <ShiftNotes />

      {/* My Requests */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">My Requests</h2>
        {myRequests.length === 0 ? (
          <div className="rounded-lg border border-playa-border bg-playa-card px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No requests submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => {
              const currentShift = getShiftById(req.shiftId);
              const targetShiftForReq = getShiftById(req.targetShiftId);
              return (
                <div key={req.id} className="rounded-lg border border-playa-border bg-playa-card p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${
                        req.type === 'change_request'
                          ? 'bg-neon-cyan/20 text-neon-cyan'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {req.type === 'change_request' ? 'Change' : 'Cancel'}
                    </span>

                    <div className="flex-1 text-sm text-gray-400">
                      <span className="text-gray-300">{currentShift?.title ?? req.shiftId}</span>
                      {req.type === 'change_request' && targetShiftForReq && (
                        <>
                          <span className="mx-2 text-gray-600">→</span>
                          <span className="text-neon-cyan">{targetShiftForReq.title}</span>
                        </>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        req.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : req.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>

                    <span className="text-gray-600 text-xs">
                      {formatTs(req.createdAt as unknown as { toDate: () => Date })}
                    </span>
                  </div>

                  {req.reviewNote && (
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Admin note: "{req.reviewNote}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shift detail modal */}
      <Modal
        isOpen={!!liveSelectedShift && !requestMode}
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
              <span>{liveSelectedShift.startTime} – {liveSelectedShift.endTime}</span>
              {liveSelectedShift.location && <span>{liveSelectedShift.location}</span>}
            </div>

            {liveSelectedShift.description && (
              <p className="text-gray-400 text-sm">{liveSelectedShift.description}</p>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Slots ({liveSelectedShift.slots.filter((s) => s.assignedTo).length}/{liveSelectedShift.slots.length} filled)
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
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRequestModal('change', slot.id)}
                            >
                              Request Change
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => openRequestModal('cancel', slot.id)}
                            >
                              Request Cancel
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancel(liveSelectedShift.id, slot.id)}
                              isLoading={isLoadingSlot}
                            >
                              Cancel Slot
                            </Button>
                          </>
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

      {/* Change / Cancel Request modal */}
      <Modal
        isOpen={!!requestMode}
        onClose={() => setRequestMode(null)}
        title={requestMode === 'change' ? 'Request Shift Change' : 'Request Slot Cancellation'}
        size="sm"
      >
        <div className="space-y-4">
          {requestMode === 'change' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Target Shift
                </label>
                <select
                  value={targetShiftId}
                  onChange={(e) => { setTargetShiftId(e.target.value); setTargetSlotId(''); }}
                  className="w-full px-3 py-2 bg-playa-card border border-playa-border rounded-lg text-gray-200 text-sm focus:outline-none focus:border-neon-cyan"
                >
                  <option value="">Select a shift...</option>
                  {shifts
                    .filter((s) => s.id !== selectedShift?.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {s.startTime}–{s.endTime}
                      </option>
                    ))}
                </select>
              </div>

              {targetShift && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Target Slot
                  </label>
                  <select
                    value={targetSlotId}
                    onChange={(e) => setTargetSlotId(e.target.value)}
                    className="w-full px-3 py-2 bg-playa-card border border-playa-border rounded-lg text-gray-200 text-sm focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="">Select a slot...</option>
                    {targetShift.slots
                      .filter((s) => !s.assignedTo && !s.preAssigned)
                      .map((s, i) => (
                        <option key={s.id} value={s.id}>
                          Open slot #{i + 1}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Message {requestMode === 'cancel' ? '(reason)' : '(optional)'}
            </label>
            <textarea
              className="w-full px-3 py-2 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan resize-y min-h-[80px] text-sm"
              placeholder={
                requestMode === 'cancel'
                  ? 'Why are you cancelling? (optional)'
                  : 'Any notes for the admin...'
              }
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setRequestMode(null)}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRequest}
              isLoading={submitting}
              disabled={requestMode === 'change' && !targetShiftId}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
