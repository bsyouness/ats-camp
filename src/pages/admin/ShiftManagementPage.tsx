import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getAllShifts, createShift, updateShift, deleteShift } from '../../services/shifts';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, ShiftSlot, User } from '../../types';
import { Button, Input, Loading, Modal } from '../../components/ui';
import { ShiftCalendar } from '../../components/shifts/ShiftCalendar';
import { ShiftRequestQueue } from '../../components/shifts/ShiftRequestQueue';
import { ShiftNotes } from '../../components/shifts/ShiftNotes';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function ShiftManagementPage() {
  const { firebaseUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [actionShift, setActionShift] = useState<Shift | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [slots, setSlots] = useState<ShiftSlot[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [shiftsData, usersData] = await Promise.all([getAllShifts(), getAllUsers()]);
      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setSlots([{ id: generateId(), assignedTo: null, preAssigned: false }]);
    setEditingShift(null);
  };

  const openCreateModal = (clickDate?: Date, hour?: number) => {
    resetForm();
    if (clickDate) setDate(clickDate.toISOString().split('T')[0]);
    if (hour !== undefined) {
      setStartTime(`${hour.toString().padStart(2, '0')}:00`);
      setEndTime(`${((hour + 1) % 24).toString().padStart(2, '0')}:00`);
    }
    setShowModal(true);
  };

  const openEditModal = (shift: Shift) => {
    setActionShift(null);
    setEditingShift(shift);
    setTitle(shift.title);
    setDescription(shift.description);
    const shiftDate = (shift.date as unknown as { toDate: () => Date }).toDate();
    setDate(shiftDate.toISOString().split('T')[0]);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setLocation(shift.location);
    setSlots(shift.slots);
    setShowModal(true);
  };

  const handleDuplicate = async (shift: Shift) => {
    if (!firebaseUser) return;
    setActionShift(null);
    setSaving(true);
    try {
      const shiftDate = (shift.date as unknown as { toDate: () => Date }).toDate();
      await createShift({
        title: shift.title + ' (copy)',
        description: shift.description,
        date: shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        slots: shift.slots.map((s) => ({ ...s, id: generateId(), assignedTo: null })),
        createdBy: firebaseUser.uid,
        published: false,
      });
      await fetchData();
    } catch {
      alert('Failed to duplicate shift');
    } finally {
      setSaving(false);
    }
  };

  const addSlot = (preAssigned: boolean) => {
    setSlots([...slots, { id: generateId(), assignedTo: null, preAssigned }]);
  };

  const removeSlot = (slotId: string) => {
    setSlots(slots.filter((s) => s.id !== slotId));
  };

  const updateSlotAssignment = (slotId: string, userId: string | null) => {
    setSlots(slots.map((s) => (s.id === slotId ? { ...s, assignedTo: userId } : s)));
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    if (slots.length === 0) {
      alert('A shift must have at least one slot.');
      return;
    }
    setSaving(true);
    try {
      if (editingShift) {
        await updateShift(editingShift.id, { title, description, startTime, endTime, location, slots });
      } else {
        await createShift({
          title,
          description,
          date: new Date(date + 'T12:00:00'),
          startTime,
          endTime,
          location,
          slots,
          createdBy: firebaseUser.uid,
          published: false,
        });
      }
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteShift(deleteTarget.id);
      setDeleteTarget(null);
      setActionShift(null);
      await fetchData();
    } catch {
      alert('Failed to delete shift');
    }
  };

  const handlePublishAll = async () => {
    const unpublished = shifts.filter((s) => s.published === false);
    if (unpublished.length === 0) {
      alert('No unpublished shifts to publish.');
      return;
    }
    setPublishing(true);
    try {
      await Promise.all(unpublished.map((s) => updateShift(s.id, { published: true })));
      setShowPublishConfirm(false);
      await fetchData();
    } catch {
      alert('Failed to publish shifts');
    } finally {
      setPublishing(false);
    }
  };

  const getUserByUid = (uid: string | null) => {
    if (!uid) return null;
    return users.find((u) => u.uid === uid);
  };

  const unpublishedCount = shifts.filter((s) => s.published === false).length;

  const handleMoveShift = async (shift: Shift, nextDate: Date, nextStartTime: string, nextEndTime: string) => {
    try {
      await updateShift(shift.id, {
        date: Timestamp.fromDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), 12, 0, 0)) as Shift['date'],
        startTime: nextStartTime,
        endTime: nextEndTime,
      });
      setActionShift(null);
      await fetchData();
    } catch (error) {
      console.error('Error moving shift:', error);
      alert('Failed to move shift');
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shift Management</h1>
          <p className="text-gray-400">Click a shift for actions · Double-click to edit · Click an empty slot to create</p>
        </div>
        <div className="flex gap-3">
          {unpublishedCount > 0 && (
            <Button variant="secondary" onClick={() => setShowPublishConfirm(true)} isLoading={publishing}>
              Publish Changes ({unpublishedCount})
            </Button>
          )}
          <Button variant="add" onClick={() => openCreateModal()}>+ Create Shift</Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-playa-card border border-playa-border rounded-xl p-6 mb-6">
        <ShiftCalendar
          shifts={shifts}
          users={users}
          myUid={firebaseUser?.uid ?? null}
          isAdmin={true}
          onShiftClick={(shift) => setActionShift(shift)}
          onShiftDoubleClick={openEditModal}
          onEmptyCellClick={openCreateModal}
          onShiftMove={handleMoveShift}
        />
      </div>

      {/* Shift Request Queue */}
      <ShiftRequestQueue shifts={shifts} users={users} onRequestResolved={fetchData} />

      {/* Action Modal (single-click) */}
      <Modal
        isOpen={!!actionShift}
        onClose={() => setActionShift(null)}
        title={actionShift?.title ?? ''}
        size="sm"
      >
        {actionShift && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              {(() => {
                const d = (actionShift.date as unknown as { toDate: () => Date }).toDate();
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              })()}
              {' · '}{actionShift.startTime}–{actionShift.endTime}
              {actionShift.published === false && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">draft</span>
              )}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button className="w-full" onClick={() => openEditModal(actionShift)}>
                Edit Shift
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => handleDuplicate(actionShift)} isLoading={saving}>
                Duplicate
              </Button>
              {actionShift.published === false ? (
                <Button variant="secondary" className="w-full" onClick={async () => {
                  await updateShift(actionShift.id, { published: true });
                  setActionShift(null);
                  await fetchData();
                }}>
                  Publish This Shift
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" onClick={async () => {
                  await updateShift(actionShift.id, { published: false });
                  setActionShift(null);
                  await fetchData();
                }}>
                  Unpublish
                </Button>
              )}
              <Button variant="danger" className="w-full" onClick={() => { setDeleteTarget(actionShift); setActionShift(null); }}>
                Delete Shift
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingShift ? 'Edit Shift' : 'Create Shift'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g., Kitchen Duty"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan resize-y min-h-[80px]"
              placeholder="Describe the shift duties..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={!!editingShift}
            />
            <Input
              label="Location"
              placeholder="e.g., Kitchen tent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              type="time"
              label="End Time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          {/* Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Slots <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <Button variant="add" size="sm" onClick={() => addSlot(false)}>+ Open Slot</Button>
                <Button variant="add" size="sm" onClick={() => addSlot(true)}>+ Pre-assigned</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {slots.map((slot, index) => (
                <div key={slot.id} className="flex items-center gap-2 p-2 bg-playa-surface rounded">
                  <span className="text-gray-500 text-sm w-8">#{index + 1}</span>
                  {slot.preAssigned ? (
                    <select
                      value={slot.assignedTo || ''}
                      onChange={(e) => updateSlotAssignment(slot.id, e.target.value || null)}
                      className="flex-1 px-3 py-1 bg-playa-card border border-playa-border rounded text-gray-200 text-sm"
                    >
                      <option value="">Select user...</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-gray-400 text-sm">
                      {slot.assignedTo ? getUserByUid(slot.assignedTo)?.displayName : 'Open for signup'}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded ${slot.preAssigned ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-cyan/20 text-neon-cyan'}`}>
                    {slot.preAssigned ? 'Pre-assigned' : 'Open'}
                  </span>
                  <button onClick={() => removeSlot(slot.id)} className="text-gray-500 hover:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="text-red-400 text-sm text-center py-2">At least one slot is required</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-between pt-4">
            {editingShift && (
              <Button
                variant="danger"
                onClick={() => { setShowModal(false); setDeleteTarget(editingShift); }}
              >
                Delete Shift
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                isLoading={saving}
                disabled={!title || !date || !startTime || !endTime || slots.length === 0}
              >
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Shift Notes */}
      <ShiftNotes />

      <Modal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        title="Publish Changes"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Publish all <span className="text-white font-medium">{unpublishedCount}</span> unpublished shifts?
            This will make them visible to members immediately.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowPublishConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublishAll} isLoading={publishing}>
              Publish Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Shift"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">"{deleteTarget?.title}"</span>?
            This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
