import { useRef, useState } from 'react';
import { X, Upload, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  parseRentalImportFile,
  downloadRentalImportTemplate,
  type RentalOrderImportRow,
} from '../../utils/rentalExcelUtils';

interface Props {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function RentalExcelImportModal({ onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [valid, setValid] = useState<RentalOrderImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; message: string }[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [parseLoading, setParseLoading] = useState(false);

  // ── file pick ─────────────────────────────────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseLoading(true);
    try {
      const result = await parseRentalImportFile(file);
      setValid(result.valid);
      setParseErrors(result.errors);
      setStep('preview');
    } catch (err: any) {
      setParseErrors([{ row: 0, message: err.message }]);
      setStep('preview');
    } finally {
      setParseLoading(false);
    }
  };

  // ── import to supabase ────────────────────────────────────────────────────
  const handleImport = async () => {
    if (valid.length === 0) return;
    setStep('importing');
    const errs: string[] = [];
    let ok = 0;

    for (const row of valid) {
      const orderNumber = row.order_number
        || `RTL-IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('rental_orders').insert({
        order_number: orderNumber,
        customer_name: row.customer_name,
        customer_email: row.customer_email ?? null,
        customer_phone: row.customer_phone,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_days: row.duration_days ?? 1,
        total_amount: row.total_amount ?? 0,
        total_deposit: row.total_deposit ?? 0,
        total_rental_cost: (row.total_amount ?? 0) - (row.total_deposit ?? 0),
        status: row.status ?? 'awaiting_payment',
        payment_status: row.status === 'paid' || row.status === 'active' ? 'paid' : 'unpaid',
        source: 'formal',
      });

      if (error) {
        errs.push(`${row.customer_name}: ${error.message}`);
      } else {
        ok++;
      }
    }

    setImportedCount(ok);
    setImportErrors(errs);
    setStep('done');
    if (ok > 0) onSuccess(ok);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import dari Excel</h2>
              <p className="text-sm text-gray-500">Upload file .xlsx untuk menambah rental orders sekaligus</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── STEP: UPLOAD ── */}
          {step === 'upload' && (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Belum punya template?</p>
                  <p className="text-xs text-blue-700 mt-0.5">Download template Excel yang sudah sesuai format</p>
                </div>
                <button
                  onClick={downloadRentalImportTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-main-400 hover:bg-main-50/30 transition-all group"
              >
                {parseLoading ? (
                  <Loader2 className="w-10 h-10 text-main-500 mx-auto mb-3 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-main-500 transition-colors" />
                )}
                <p className="text-sm font-semibold text-gray-700 group-hover:text-main-700">
                  {parseLoading ? 'Memproses file...' : 'Klik untuk pilih file Excel'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Format yang didukung: .xlsx, .xls</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>

              {/* Column guide */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Kolom yang Dibutuhkan</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'customer_name', note: 'Wajib', req: true },
                    { name: 'customer_phone', note: 'Wajib', req: true },
                    { name: 'start_time', note: 'Wajib · dd/mm/yyyy', req: true },
                    { name: 'end_time', note: 'Wajib · dd/mm/yyyy', req: true },
                    { name: 'customer_email', note: 'Opsional', req: false },
                    { name: 'duration_days', note: 'Opsional', req: false },
                    { name: 'total_amount', note: 'Opsional', req: false },
                    { name: 'total_deposit', note: 'Opsional', req: false },
                    { name: 'status', note: 'Opsional', req: false },
                    { name: 'notes', note: 'Opsional', req: false },
                  ].map((col) => (
                    <div key={col.name} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${col.req ? 'bg-pink-50 border border-pink-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <code className={`font-mono font-bold ${col.req ? 'text-pink-700' : 'text-gray-700'}`}>{col.name}</code>
                      <span className="text-gray-400">— {col.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">
                <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                <span className="font-medium truncate">{fileName}</span>
              </div>

              {/* Summary badges */}
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-emerald-700">{valid.length}</p>
                    <p className="text-xs text-emerald-600">Baris valid</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-red-600">{parseErrors.length}</p>
                    <p className="text-xs text-red-500">Baris error</p>
                  </div>
                </div>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Error Ditemukan</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">• {err.message}</p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {valid.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Nama', 'No HP', 'Mulai', 'Selesai', 'Total', 'Status'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {valid.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[120px] truncate">{r.customer_name}</td>
                          <td className="px-3 py-2 text-gray-600">{r.customer_phone}</td>
                          <td className="px-3 py-2 text-gray-600">{new Date(r.start_time).toLocaleDateString('id-ID')}</td>
                          <td className="px-3 py-2 text-gray-600">{new Date(r.end_time).toLocaleDateString('id-ID')}</td>
                          <td className="px-3 py-2 text-gray-900 font-semibold">
                            {r.total_amount ? `Rp ${r.total_amount.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {valid.length > 10 && (
                    <p className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
                      + {valid.length - 10} baris lainnya tidak ditampilkan
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStep('upload'); setValid([]); setParseErrors([]); }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Pilih File Lain
                </button>
                <button
                  onClick={handleImport}
                  disabled={valid.length === 0}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Import {valid.length} Order
                </button>
              </div>
            </>
          )}

          {/* ── STEP: IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-main-500 animate-spin" />
              <p className="text-lg font-bold text-gray-900">Mengimport data...</p>
              <p className="text-sm text-gray-500">Harap tunggu, jangan tutup halaman ini</p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <>
              <div className={`flex flex-col items-center py-8 gap-4 ${importedCount > 0 ? '' : ''}`}>
                {importedCount > 0 ? (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{importedCount} order berhasil diimport</p>
                  {importErrors.length > 0 && (
                    <p className="text-sm text-red-500 mt-1">{importErrors.length} order gagal</p>
                  )}
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Order yang Gagal</p>
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">• {err}</p>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Selesai
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
