import { useState } from 'react';
import { useBulkImportStockOpname } from '../../../hooks/useStockOpname';
import { useToast } from '../../../components/Toast';

interface StockOpnameImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const StockOpnameImportModal = ({ isOpen, onClose, onSuccess }: StockOpnameImportModalProps) => {
  const { showToast } = useToast();
  const importMutation = useBulkImportStockOpname();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    try {
      const XLSX = (await import('xlsx')).default;
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Preview first 5 rows
        setPreview(jsonData.slice(0, 5));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      showToast('error', 'Gagal membaca file XLSX');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('warning', 'Pilih file XLSX terlebih dahulu');
      return;
    }

    try {
      const XLSX = (await import('xlsx')).default;
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map XLSX columns to expected format
        const mappedData = jsonData.map((row: any) => ({
          product_id: parseInt(row['Product ID'] || row['product_id'] || 0),
          variant_id: parseInt(row['Variant ID'] || row['variant_id'] || 0),
          quantity_change: parseInt(row['Quantity Change'] || row['quantity_change'] || 0),
          unit: row['Unit'] || row['unit'] || 'pcs',
          cost_per_unit: parseFloat(row['Cost Per Unit'] || row['cost_per_unit'] || 0),
          transaction_type: row['Transaction Type'] || row['transaction_type'] || 'adjustment',
          location: row['Location'] || row['location'] || 'SparkStage55',
        }));

        const result = await importMutation.mutateAsync(mappedData);
        
        showToast(
          'success',
          `${result.total_imported} item berhasil diimport${result.total_errors > 0 ? `, ${result.total_errors} gagal` : ''}`
        );
        
        onSuccess(result.message);
        handleClose();
      };
      
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengimport data');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview([]);
    onClose();
  };

  const downloadTemplate = () => {
    try {
      import('xlsx').then((XLSX) => {
        const templateData = [
          {
            'Product ID': 1,
            'Variant ID': 1,
            'Quantity Change': 10,
            'Unit': 'pcs',
            'Cost Per Unit': 50000,
            'Transaction Type': 'stock_in',
            'Location': 'SparkStage55',
          },
          {
            'Product ID': 2,
            'Variant ID': 2,
            'Quantity Change': -5,
            'Unit': 'pcs',
            'Cost Per Unit': 75000,
            'Transaction Type': 'stock_out',
            'Location': 'SparkStage55',
          },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, 'stock-opname-template.xlsx');
        showToast('success', 'Template berhasil diunduh');
      });
    } catch (err) {
      showToast('error', 'Gagal mengunduh template');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Import Stock Opname dari XLSX</h2>
        </div>

        <div className="p-6">
          {/* File Upload Area */}
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-400">
              cloud_upload
            </span>
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Drag file XLSX atau klik untuk memilih
            </p>
            <label className="inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                Pilih File
              </span>
            </label>
            <p className="mt-3 text-xs text-gray-500">File maksimal 10MB, format .xlsx</p>
          </div>

          {selectedFile && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {selectedFile.name}
              </p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 font-semibold text-gray-900">Preview Data:</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-3 py-2 text-gray-600">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">Menampilkan 5 baris pertama</p>
            </div>
          )}

          {/* Template Info */}
          <div className="mb-6 rounded-lg bg-amber-50 p-4">
            <p className="mb-2 text-sm text-amber-900">
              <strong>Format XLSX yang diperlukan:</strong>
            </p>
            <ul className="text-xs text-amber-800 space-y-1 ml-4">
              <li>• Product ID (required)</li>
              <li>• Variant ID (required)</li>
              <li>• Quantity Change (required) - positif untuk stok masuk, negatif untuk stok keluar</li>
              <li>• Unit (optional) - default: pcs</li>
              <li>• Cost Per Unit (optional)</li>
              <li>• Transaction Type (optional) - stock_in, stock_out, adjustment</li>
              <li>• Location (optional) - default: SparkStage55</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-900"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Template
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importMutation.isPending ? 'Mengimport...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
