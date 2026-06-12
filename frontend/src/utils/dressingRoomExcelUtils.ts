import * as XLSX from 'xlsx';
import type { DressingRoomProductDraft } from '../components/admin/DressingRoomCSVImportModal';

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export function exportDressingRoomProductsToExcel(products: any[]) {
  const rows: Record<string, unknown>[] = [];

  for (const p of products) {
    const variants = p.dressing_room_product_variants ?? [];
    if (variants.length === 0) {
      rows.push({
        product_name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        category: p.category ?? '',
        is_active: p.is_active ? 'ya' : 'tidak',
        variant_name: '',
        sku: '',
        size_label: '',
        color: '',
        price: '',
        daily_rental_fee: '',
        stock: '',
      });
    } else {
      variants.forEach((v: any, idx: number) => {
        rows.push({
          product_name: idx === 0 ? p.name : '',       // only first row shows product info
          slug: idx === 0 ? (p.slug ?? '') : '',
          description: idx === 0 ? (p.description ?? '') : '',
          category: idx === 0 ? (p.category ?? '') : '',
          is_active: idx === 0 ? (p.is_active ? 'ya' : 'tidak') : '',
          variant_name: v.name ?? '',
          sku: v.sku ?? '',
          size_label: v.size_label ?? '',
          color: v.color ?? '',
          price: v.price ?? 0,
          daily_rental_fee: v.daily_rental_fee ?? 0,
          stock: v.total_quantity ?? 0,
        });
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.max(k.length + 2, 14),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk DR');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `dressing-room-products_${date}.xlsx`);
}

// ─── TEMPLATE ────────────────────────────────────────────────────────────────

export function downloadDRProductTemplate() {
  const sample = [
    {
      product_name: 'Kebaya Modern Hitam',
      slug: 'kebaya-modern-hitam',
      description: 'Kebaya hitam elegan untuk acara formal',
      category: 'kebaya',
      is_active: 'ya',
      variant_name: 'Size S',
      sku: 'KMH-S-001',
      size_label: 'S',
      color: 'Hitam',
      price: 150000,
      daily_rental_fee: 15000,
      stock: 3,
    },
    {
      product_name: '',          // blank = belongs to same product above
      slug: '',
      description: '',
      category: '',
      is_active: '',
      variant_name: 'Size M',
      sku: 'KMH-M-001',
      size_label: 'M',
      color: 'Hitam',
      price: 150000,
      daily_rental_fee: 15000,
      stock: 2,
    },
    {
      product_name: 'Gaun Pesta Merah',
      slug: 'gaun-pesta-merah',
      description: 'Gaun pesta panjang warna merah menawan',
      category: 'gaun',
      is_active: 'ya',
      variant_name: 'Size M',
      sku: 'GPM-M-001',
      size_label: 'M',
      color: 'Merah',
      price: 200000,
      daily_rental_fee: 20000,
      stock: 1,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample);
  ws['!cols'] = Object.keys(sample[0]).map((k) => ({ wch: Math.max(k.length + 4, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-import-produk-dr.xlsx');
}

// ─── PARSE IMPORT ─────────────────────────────────────────────────────────────

export interface DRImportResult {
  products: DressingRoomProductDraft[];
  errors: string[];
}

export function parseDRProductsFromExcel(file: File): Promise<DRImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const products: DressingRoomProductDraft[] = [];
        const errors: string[] = [];
        let currentProduct: DressingRoomProductDraft | null = null;

        raw.forEach((row, idx) => {
          const rowNum = idx + 2;
          const productName = String(row['product_name'] ?? '').trim();
          const variantName = String(row['variant_name'] ?? '').trim();
          const sku = String(row['sku'] ?? '').trim();

          // New product row
          if (productName) {
            currentProduct = {
              name: productName,
              slug: String(row['slug'] ?? '').trim() || productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
              description: String(row['description'] ?? '').trim(),
              category: String(row['category'] ?? 'clothing').trim() || 'clothing',
              dressing_room_category_id: null,
              image_url: '',
              is_active: String(row['is_active'] ?? 'ya').trim().toLowerCase() !== 'tidak',
              variants: [],
            };
            products.push(currentProduct);
          }

          // Variant row
          if (sku) {
            if (!currentProduct) {
              errors.push(`Baris ${rowNum}: variant SKU "${sku}" tidak punya produk induk`);
              return;
            }
            currentProduct.variants.push({
              name: variantName || 'Default',
              sku,
              size_label: String(row['size_label'] ?? '').trim(),
              color: String(row['color'] ?? '').trim(),
              price: Number(row['price']) || 0,
              daily_rental_fee: Number(row['daily_rental_fee']) || 15000,
              total_quantity: Number(row['stock']) || 1,
            });
          }
        });

        // Remove products without variants, add a default one
        for (const p of products) {
          if (p.variants.length === 0) {
            p.variants.push({
              name: 'Default',
              sku: `${p.slug}-default`,
              size_label: '',
              color: '',
              price: 0,
              daily_rental_fee: 15000,
              total_quantity: 1,
            });
          }
        }

        if (products.length === 0) {
          errors.push('Tidak ada produk valid di file. Pastikan kolom product_name tidak kosong.');
        }

        resolve({ products, errors });
      } catch (err: any) {
        reject(new Error(`Gagal parse file: ${err.message}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
