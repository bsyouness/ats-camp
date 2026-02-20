import { useState, useEffect, useCallback } from 'react';
import { getPendingShiftRequests, updateShiftRequestStatus } from '../../services/shiftRequests';
import { useAuth } from '../../contexts/AuthContext';
import { ShiftRequest, Shift, User } from '../../types';
import { Button, Modal } from '../ui';

interface ShiftRequestQueueProps {
  shifts: Shift[];
  users: User[];
  onRequestResolved?: () => void;
}

export function ShiftRequestQueue({ shifts, users, onRequestResolved }: ShiftRequestQueueProps) {
  const { firebaseUser } = useAuth();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRequest, setReviewRequest] = useState<ShiftRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'denied' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getPendingShiftRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching shift requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getUser = (uid: string) => users.find((u) => u.uid === uid);
  const getShift = (id: string | null) => id ? shifts.find((s) => s.id === id) : null;

  const openReview = (req: ShiftRequest, action: 'approved' | 'denied') => {
    setReviewRequest(req);
    setReviewAction(action);
    setReviewNote('');
  };

  const handleReview = async () => {
    if (!reviewRequest || !reviewAction || !firebaseUser) return;
    setSaving(true);
    try {
      await updateShiftRequestStatus(
        reviewRequest.id,
        reviewAction,
        firebaseUser.uid,
        reviewNote || null
      );
      setReviewRequest(null);
      setReviewAction(null);
      await fetchRequests();
      onRequestResolved?.();
    } catch (err) {
      console.error('Error reviewing request:', err);
      alert('Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  const formatTs = (ts: { toDate: () => Date } | null) => {
    if (!ts) return '';
    return ts.toDate().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">Shift Change Requests</h2>
        {!loading && requests.length > 0 && (
          <span className="px-2 py-0.5 bg-neon-orange text-white text-xs font-bold rounded-full">
            {requests.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading requests…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-playa-border bg-playa-card px-6 py-8 text-center">
          <p className="text-gray-500">No pending requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const requester = getUser(req.userId);
            const currentShift = getShift(req.shiftId);
            const targetShift = getShift(req.targetShiftId);

            return (
              <div
                key={req.id}
                className="rounded-lg border border-playa-border bg-playa-card p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Requester */}
                  <div className="flex items-center gap-3 min-w-[160px]">
                    {requester?.photoURL ? (
                      <img
                        src={requester.photoURL}
                        alt={requester.displayName}
                        className="w-9 h-9 rounded-full"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-playa-surface flex items-center justify-center text-sm font-bold text-gray-400">
                        {requester?.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <div className="text-white text-sm font-medium">
                        {requester?.displayName ?? req.userId}
                      </div>
                      <div className="text-gray-500 text-xs">{formatTs(req.createdAt as unknown as { toDate: () => Date })}</div>
                    </div>
                  </div>

                  {/* Type badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${
                      req.type === 'change_request'
                        ? 'bg-neon-cyan/20 text-neon-cyan'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {req.type === 'change_request' ? 'Change' : 'Cancel'}
                  </span>

                  {/* Shift info */}
                  <div className="flex-1 text-sm text-gray-400">
                    <span className="text-gray-300">{currentShift?.title ?? req.shiftId}</span>
                    {req.type === 'change_request' && targetShift && (
                      <>
                        <span className="mx-2 text-gray-600">→</span>
                        <span className="text-neon-cyan">{targetShift.title}</span>
                      </>
                    )}
                    {req.message && (
                      <p className="text-gray-500 text-xs mt-1 italic">"{req.message}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-300"
                      onClick={() => openReview(req, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => openReview(req, 'denied')}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      <Modal
        isOpen={!!reviewRequest}
        onClose={() => { setReviewRequest(null); setReviewAction(null); }}
        title={reviewAction === 'approved' ? 'Approve Request' : 'Deny Request'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {reviewAction === 'approved'
              ? 'Approve this request? The member will be notified.'
              : 'Deny this request? You can add a note explaining why.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Note (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan resize-y min-h-[80px] text-sm"
              placeholder="Add a note for the member..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setReviewRequest(null); setReviewAction(null); }}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approved' ? 'primary' : 'danger'}
              size="sm"
              onClick={handleReview}
              isLoading={saving}
            >
              {reviewAction === 'approved' ? 'Approve' : 'Deny'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
