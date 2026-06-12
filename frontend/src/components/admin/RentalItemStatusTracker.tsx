import { useState } from 'react';
import { CheckCircle2, Eye } from 'lucide-react';
import { useUpdateRentalItemStatus, useRentalItemStatusHistory } from '../../hooks/useDressingRoomInventory';
import type { RentalItemStatus } from '../../types/dressingRoom';

interface RentalItemStatusTrackerProps {
  rentalOrderItemId: number;
  itemName: string;
  currentStatus: RentalItemStatus;
  onStatusUpdated?: () => void;
}

const STATUS_COLORS: Record<RentalItemStatus, string> = {
  rented: 'bg-blue-100 text-blue-800',
  in_laundry: 'bg-yellow-100 text-yellow-800',
  damaged: 'bg-red-100 text-red-800',
  returned_pending: 'bg-orange-100 text-orange-800',
  returned: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
  hold: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS: Record<RentalItemStatus, string> = {
  rented: 'Sedang Disewa',
  in_laundry: 'Di Laundry',
  damaged: 'Rusak',
  returned_pending: 'Pending Return',
  returned: 'Dikembalikan',
  lost: 'Hilang',
  hold: 'Ditahan',
};

const NEXT_STATUS_OPTIONS: Record<RentalItemStatus, RentalItemStatus[]> = {
  rented: ['in_laundry', 'returned_pending', 'damaged', 'lost'],
  in_laundry: ['rented', 'damaged', 'returned'],
  damaged: ['hold', 'returned'],
  returned_pending: ['returned', 'damaged'],
  returned: [],
  lost: ['hold'],
  hold: ['damaged', 'returned'],
};

export function RentalItemStatusTracker({
  rentalOrderItemId,
  itemName,
  currentStatus,
  onStatusUpdated,
}: RentalItemStatusTrackerProps) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<RentalItemStatus | ''>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const updateStatus = useUpdateRentalItemStatus();
  const { data: history, isLoading: historyLoading } = useRentalItemStatusHistory(
    showHistory ? rentalOrderItemId : undefined
  );

  const handleUpdateStatus = async () => {
    if (!selectedNewStatus || !reason) {
      alert('Silakan isi status dan alasan');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        rentalOrderItemId,
        newStatus: selectedNewStatus as RentalItemStatus,
        reason,
        notes,
      });

      setShowStatusForm(false);
      setSelectedNewStatus('');
      setReason('');
      setNotes('');
      onStatusUpdated?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Gagal update status');
    }
  };

  const nextOptions = NEXT_STATUS_OPTIONS[currentStatus] || [];

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Current Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-700">{itemName}</h4>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[currentStatus]}`}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
            title="Lihat history"
          >
            <Eye className="h-4 w-4" />
          </button>
          {nextOptions.length > 0 && (
            <button
              onClick={() => setShowStatusForm(!showStatusForm)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Update status"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Update Status Form */}
      {showStatusForm && nextOptions.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h5>

          <div className="space-y-3">
            {/* Status Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status Baru
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value as RentalItemStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih status...</option>
                {nextOptions.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alasan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Cleaning scheduled, Item damaged"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Catatan (Opsional)
              </label>
              <textarea
                placeholder="Deskripsi tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdateStatus}
                disabled={updateStatus.isPending || !selectedNewStatus || !reason}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateStatus.isPending ? 'Updating...' : 'Update Status'}
              </button>
              <button
                onClick={() => {
                  setShowStatusForm(false);
                  setSelectedNewStatus('');
                  setReason('');
                  setNotes('');
                }}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Batalkan
              </button>
            </div>

            {updateStatus.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {String(updateStatus.error)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status History */}
      {showHistory && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">History Status</h5>

          {historyLoading ? (
            <div className="text-sm text-gray-600 text-center py-4">Loading...</div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {history.map((entry) => (
                <div key={entry.id} className="border-l-4 border-gray-300 pl-3 py-2">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className="inline-block text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {STATUS_LABELS[entry.status as RentalItemStatus]}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {entry.previous_status && (
                    <p className="text-xs text-gray-600 mb-1">
                      Dari: {STATUS_LABELS[entry.previous_status as RentalItemStatus]}
                    </p>
                  )}

                  {entry.reason && (
                    <p className="text-xs font-medium text-gray-800 mb-1">
                      Alasan: {entry.reason}
                    </p>
                  )}

                  {entry.notes && (
                    <p className="text-xs text-gray-600 italic">
                      Catatan: {entry.notes}
                    </p>
                  )}

                  {entry.created_by_email && (
                    <p className="text-xs text-gray-500 mt-1">
                      Oleh: {entry.created_by_email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600 text-center py-4">
              Belum ada history
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RentalItemStatusTracker;
