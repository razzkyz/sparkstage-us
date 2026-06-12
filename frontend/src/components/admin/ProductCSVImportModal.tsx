import { useState, useRef } from 'react';
import type { ProductDraft } from './ProductFormModal';
import { downloadStoreProductTemplateExcel, parseStoreProductsFromFile } from '../../utils/storeExcelUtils';

interface ProductCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ProductDraft[]) => Promise<void>;
  isImporting: boolean;
}

export function ProductCSVImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: ProductCSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedProducts, setParsedProducts] = useState<ProductDraft[]>([]);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setParsedProducts([]);
    setFileName(file.name);

    try {
      const products = await parseStoreProductsFromFile(file);
      setParsedProducts(products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal parse file');
      setParsedProducts([]);
    }
  };

  const handleImport = async () => {
    if (parsedProducts.length === 0) return;

    try {
      const drafts: ProductDraft[] = parsedProducts.map((p) => ({
        id: undefined,
        name: p.name,
        slug: p.slug,
        description: p.description,
        category_id: p.category_id,
        sku: p.sku,
        is_active: p.is_active,
        variants: p.variants,
      }));

      await onImport(drafts);
      setParsedProducts([]);
      setFileName('');
      setError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal import produk');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Produk Excel</h2>
            <p className="text-sm text-gray-500">Upload file .xls atau .xlsx untuk menambahkan produk secara batch.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-blue-900 font-semibold mb-1">Import Excel Produk</p>
              <p className="text-xs text-blue-800 font-mono leading-5">
                product_name, sku, description, category_id, price, stock, variant_name, variant_sku, color, size, is_active, slug
              </p>
              <p className="text-xs text-blue-800 mt-2">
                Wajib: product_name, sku | Opsional: kolom lainnya
              </p>
            </div>
            <button
              type="button"
              onClick={downloadStoreProductTemplateExcel}
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Download Template Excel
            </button>
          </div>
        </div>

        {/* File input */}
        <div className="mb-6">
          <label className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-white">
            <span className="material-symbols-outlined text-4xl text-gray-500">upload_file</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Klik untuk pilih file Excel</p>
              <p className="text-xs text-gray-500">Format: .xlsx, .xls</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              disabled={isImporting}
              className="hidden"
            />
          </label>
          {fileName && (
            <p className="mt-3 text-xs text-gray-600">File yang dipilih: <strong>{fileName}</strong></p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Preview */}
        {parsedProducts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Preview ({parsedProducts.length} produk akan ditambahkan)
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nama</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Harga</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{p.name}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs font-mono">{p.sku}</td>
                      <td className="px-4 py-2 text-gray-600">Rp {p.variants[0].price}</td>
                      <td className="px-4 py-2 text-gray-600">{p.variants[0].stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={parsedProducts.length === 0 || isImporting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isImporting ? 'Importing...' : `Import ${parsedProducts.length} Produk`}
          </button>
        </div>
      </div>
    </div>
  );
}
