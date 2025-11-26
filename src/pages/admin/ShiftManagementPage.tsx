import { useState, useEffect } from 'react';
import { getAllShifts, createShift, updateShift, deleteShift } from '../../services/shifts';
import { getAllUsers } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, ShiftSlot, User } from '../../types';
import { Card, CardContent, Button, Input, Loading, Modal } from '../../components/ui';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function ShiftManagementPage() {
  const { firebaseUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);

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
      const [shiftsData, usersData] = await Promise.all([
        getAllShifts(),
        getAllUsers(),
      ]);
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
    setSlots([]);
    setEditingShift(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setTitle(shift.title);
    setDescription(shift.description);
    const shiftDate = shift.date as unknown as { toDate: () => Date };
    setDate(shiftDate.toDate().toISOString().split('T')[0]);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setLocation(shift.location);
    setSlots(shift.slots);
    setShowModal(true);
  };

  const addSlot = (preAssigned: boolean) => {
    setSlots([...slots, { id: generateId(), assignedTo: null, preAssigned }]);
  };

  const removeSlot = (slotId: string) => {
    setSlots(slots.filter((s) => s.id !== slotId));
  };

  const updateSlotAssignment = (slotId: string, userId: string | null) => {
    setSlots(
      slots.map((s) => (s.id === slotId ? { ...s, assignedTo: userId } : s))
    );
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    setSaving(true);

    try {
      if (editingShift) {
        await updateShift(editingShift.id, {
          title,
          description,
          startTime,
          endTime,
          location,
          slots,
        });
      } else {
        await createShift({
          title,
          description,
          date: new Date(date),
          startTime,
          endTime,
          location,
          slots,
          createdBy: firebaseUser.uid,
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

  const handleDelete = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      await deleteShift(shiftId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Failed to delete shift');
    }
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shift Management</h1>
          <p className="text-gray-400">Create and manage camp shifts</p>
        </div>
        <Button onClick={openCreateModal}>Create Shift</Button>
      </div>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400">No shifts created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{shift.title}</h3>
                      <span className="px-2 py-0.5 bg-playa-surface text-gray-400 text-xs rounded">
                        {shift.slots.filter((s) => s.assignedTo).length}/{shift.slots.length} filled
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-2">
                      <span>{formatDate(shift.date as { toDate: () => Date })}</span>
                      <span>{shift.startTime} - {shift.endTime}</span>
                      {shift.location && <span>{shift.location}</span>}
                    </div>
                    {shift.description && (
                      <p className="text-gray-500 text-sm">{shift.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(shift)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(shift.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
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
              <label className="text-sm font-medium text-gray-300">Slots</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => addSlot(false)}>
                  + Open Slot
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addSlot(true)}>
                  + Pre-assigned Slot
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  Add slots for people to sign up
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saving} disabled={!title || !date || !startTime || !endTime}>
              {editingShift ? 'Save Changes' : 'Create Shift'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
