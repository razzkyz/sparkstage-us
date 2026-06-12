import { useState, useRef } from 'react';
import { X, Upload, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseDRProductsFromExcel, downloadDRProductTemplate } from '../../utils/dressingRoomExcelUtils';

export interface DressingRoomProductDraft {
  id?: number;
  name: string;
  slug: string;
  description: string;
  dressing_room_category_id: number | null;
  category: string;
  image_url: string;
  is_active: boolean;
  variants: Array<{
    name: string;
    sku: string;
    size_label: string;
    color: string;
    price: number;
    daily_rental_fee: number;
    total_quantity: number;
  }>;
}

interface DressingRoomCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: DressingRoomProductDraft[]) => Promise<void>;
  isImporting: boolean;
}

type Step = 'upload' | 'preview' | 'done';

export function DressingRoomCSVImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: DressingRoomCSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedProducts, setParsedProducts] = useState<DressingRoomProductDraft[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [step, setStep] = useState<Step>('upload');

  const reset = () => {
    setParsedProducts([]);
    setParseErrors([]);
    setFileName('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseLoading(true);
    try {
      const result = await parseDRProductsFromExcel(file);
      setParsedProducts(result.products);
      setParseErrors(result.errors);
      setStep('preview');
    } catch (err: any) {
      setParseErrors([err.message]);
      setStep('preview');
    } finally {
      setParseLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedProducts.length === 0) return;
    try {
      await onImport(parsedProducts);
      reset();
      onClose();
    } catch (err: any) {
      setParseErrors((prev) => [...prev, err.message]);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import Katalog dari Excel</h2>
              <p className="text-sm text-gray-500">Upload file .xlsx untuk menambah produk sekaligus</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={isImporting} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
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
                  <p className="text-xs text-blue-700 mt-0.5">Download template Excel dengan contoh format produk & varian</p>
                </div>
                <button
                  onClick={downloadDRProductTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-all group"
              >
                {parseLoading ? (
                  <Loader2 className="w-10 h-10 text-pink-500 mx-auto mb-3 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-pink-500 transition-colors" />
                )}
                <p className="text-sm font-semibold text-gray-700 group-hover:text-pink-700">
                  {parseLoading ? 'Memproses file...' : 'Klik untuk pilih file Excel'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Format: .xlsx atau .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isImporting}
                />
              </div>

              {/* Column guide */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Kolom Excel</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'product_name', note: 'Wajib (baris pertama varian)', req: true },
                    { name: 'sku', note: 'Wajib tiap varian', req: true },
                    { name: 'variant_name', note: 'Nama varian (Size S, dll)', req: false },
                    { name: 'size_label', note: 'Ukuran (S/M/L/XL)', req: false },
                    { name: 'color', note: 'Warna', req: false },
                    { name: 'price', note: 'Harga jual', req: false },
                    { name: 'daily_rental_fee', note: 'Biaya sewa/hari', req: false },
                    { name: 'stock', note: 'Jumlah stok', req: false },
                    { name: 'slug', note: 'URL slug (auto-generate)', req: false },
                    { name: 'is_active', note: '"ya" atau "tidak"', req: false },
                  ].map((col) => (
                    <div key={col.name} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${col.req ? 'bg-pink-50 border border-pink-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <code className={`font-mono font-bold ${col.req ? 'text-pink-700' : 'text-gray-700'}`}>{col.name}</code>
                      <span className="text-gray-400 truncate">— {col.note}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  💡 Satu produk bisa punya banyak baris varian. Isi <code className="font-mono">product_name</code> hanya di baris pertama tiap produk, baris varian berikutnya biarkan kosong.
                </p>
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
                    <p className="text-2xl font-black text-emerald-700">{parsedProducts.length}</p>
                    <p className="text-xs text-emerald-600">Produk valid</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-red-600">{parseErrors.length}</p>
                    <p className="text-xs text-red-500">Error</p>
                  </div>
                </div>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Error Ditemukan</p>
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• {e}</p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {parsedProducts.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['Nama Produk', 'Varian', 'SKU', 'Biaya Sewa', 'Stok'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedProducts.flatMap((p) =>
                        p.variants.map((v, vi) => (
                          <tr key={`${p.name}-${vi}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate">
                              {vi === 0 ? p.name : <span className="text-gray-300">↳</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{v.name}</td>
                            <td className="px-3 py-2 font-mono text-gray-500">{v.sku}</td>
                            <td className="px-3 py-2 text-gray-700 font-semibold">
                              Rp {v.daily_rental_fee.toLocaleString('id-ID')}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{v.total_quantity}</td>
                          </tr>
                        ))
                      ).slice(0, 20)}
                    </tbody>
                  </table>
                  {parsedProducts.reduce((s, p) => s + p.variants.length, 0) > 20 && (
                    <p className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
                      + lebih banyak baris tidak ditampilkan
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { reset(); }}
                  disabled={isImporting}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Pilih File Lain
                </button>
                <button
                  onClick={handleImport}
                  disabled={parsedProducts.length === 0 || isImporting}
                  className="flex-1 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isImporting ? 'Importing...' : `Import ${parsedProducts.length} Produk`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
