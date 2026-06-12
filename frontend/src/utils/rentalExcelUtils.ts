import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RentalOrderExportRow {
  'No Order': string;
  'Tanggal Buat': string;
  'Nama Customer': string;
  'Email': string;
  'No HP': string;
  'Tanggal Mulai': string;
  'Tanggal Selesai': string;
  'Durasi (Hari)': number;
  'Total Sewa': number;
  'Total Deposit': number;
  'Total Bayar': number;
  'Status': string;
  'Status Bayar': string;
}

export interface RentalOrderImportRow {
  order_number?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  start_time: string;  // ISO or dd/mm/yyyy
  end_time: string;
  duration_days?: number;
  total_amount?: number;
  total_deposit?: number;
  status?: string;
  notes?: string;
}

export interface ImportValidationResult {
  valid: RentalOrderImportRow[];
  errors: { row: number; message: string }[];
}

// ─── Status label helper ──────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  awaiting_payment: 'Menunggu Pembayaran',
  paid: 'Sudah Bayar',
  active: 'Disewa',
  overdue: 'Telat',
  returned: 'Dikembalikan',
  cancelled: 'Dibatalkan',
  refunded: 'Refund',
};

function statusLabel(s: string) {
  return STATUS_MAP[s] ?? s;
}

function formatDate(iso: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export function exportRentalOrdersToExcel(
  orders: any[],
  filename = 'rental-orders',
) {
  const rows: RentalOrderExportRow[] = orders.map((o) => ({
    'No Order': o.order_number ?? '',
    'Tanggal Buat': formatDate(o.created_at),
    'Nama Customer': o.customer_name ?? '',
    'Email': o.customer_email ?? '',
    'No HP': o.customer_phone ?? '',
    'Tanggal Mulai': formatDate(o.start_time),
    'Tanggal Selesai': formatDate(o.end_time),
    'Durasi (Hari)': o.duration_days ?? 0,
    'Total Sewa': o.total_rental_cost ?? 0,
    'Total Deposit': o.total_deposit ?? 0,
    'Total Bayar': o.total_amount ?? 0,
    'Status': statusLabel(o.status),
    'Status Bayar': o.payment_status ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width per column
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String((r as any)[key] ?? '').length),
    ) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rental Orders');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}

// ─── TEMPLATE DOWNLOAD ────────────────────────────────────────────────────────

export function downloadRentalImportTemplate() {
  const sample: Record<string, unknown>[] = [
    {
      customer_name: 'Nama Lengkap Customer',
      customer_email: 'email@contoh.com',
      customer_phone: '08123456789',
      start_time: '01/06/2026',
      end_time: '03/06/2026',
      duration_days: 2,
      total_amount: 170000,
      total_deposit: 75000,
      status: 'awaiting_payment',
      notes: 'Catatan opsional',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample);
  ws['!cols'] = Object.keys(sample[0]).map((k) => ({ wch: Math.max(k.length + 4, 20) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-import-rental.xlsx');
}

// ─── IMPORT / PARSE ───────────────────────────────────────────────────────────

function parseLocalDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  }
  const str = String(val).trim();
  // dd/mm/yyyy
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d)).toISOString();
  }
  return new Date(str).toISOString();
}

const VALID_STATUSES = new Set([
  'awaiting_payment', 'paid', 'active', 'overdue', 'returned', 'cancelled', 'refunded',
]);

export function parseRentalImportFile(file: File): Promise<ImportValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const valid: RentalOrderImportRow[] = [];
        const errors: { row: number; message: string }[] = [];

        raw.forEach((row, idx) => {
          const rowNum = idx + 2; // 1-indexed + header
          const name = String(row['customer_name'] ?? '').trim();
          const phone = String(row['customer_phone'] ?? '').trim();
          const startRaw = row['start_time'];
          const endRaw = row['end_time'];
          const statusRaw = String(row['status'] ?? 'awaiting_payment').trim().toLowerCase();

          if (!name) {
            errors.push({ row: rowNum, message: `Baris ${rowNum}: customer_name wajib diisi` });
            return;
          }
          if (!phone) {
            errors.push({ row: rowNum, message: `Baris ${rowNum}: customer_phone wajib diisi` });
            return;
          }

          let startIso = '', endIso = '';
          try { startIso = parseLocalDate(startRaw); } catch {
            errors.push({ row: rowNum, message: `Baris ${rowNum}: format start_time tidak valid` });
            return;
          }
          try { endIso = parseLocalDate(endRaw); } catch {
            errors.push({ row: rowNum, message: `Baris ${rowNum}: format end_time tidak valid` });
            return;
          }

          const status = VALID_STATUSES.has(statusRaw) ? statusRaw : 'awaiting_payment';

          valid.push({
            order_number: String(row['order_number'] ?? '').trim() || undefined,
            customer_name: name,
            customer_email: String(row['customer_email'] ?? '').trim() || undefined,
            customer_phone: phone,
            start_time: startIso,
            end_time: endIso,
            duration_days: Number(row['duration_days']) || undefined,
            total_amount: Number(row['total_amount']) || undefined,
            total_deposit: Number(row['total_deposit']) || undefined,
            status,
            notes: String(row['notes'] ?? '').trim() || undefined,
          });
        });

        resolve({ valid, errors });
      } catch (err: any) {
        reject(new Error(`Gagal parse file: ${err.message}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
