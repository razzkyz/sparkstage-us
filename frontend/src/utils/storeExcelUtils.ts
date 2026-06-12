import * as XLSX from 'xlsx';
import type { InventoryProduct } from '../pages/admin/store-inventory/storeInventoryTypes';
import type { ProductDraft, ProductVariantDraft } from '../components/admin/product-form-modal/productFormModalTypes';

// ─── EXPORT: Stock Report ─────────────────────────────────────────────────────

export function exportStoreStockReportToExcel(products: InventoryProduct[]) {
  const rows: Record<string, unknown>[] = products.map((product) => ({
    product_name: product.name,
    sku: product.sku,
    category: product.category,
    is_active: product.is_active ? 'ya' : 'tidak',
    price_min: product.price_min,
    price_max: product.price_max,
    stock_available: product.stock_available,
    variant_count: product.variant_count,
  }));

  if (rows.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Produk');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `stock-report-${date}.xlsx`);
}

// ─── TEMPLATE ─────────────────────────────────────────────────────────────────

export function downloadStoreProductTemplateExcel() {
  const sample = [
    {
      product_name: 'Kaos Polos Hitam',
      slug: 'kaos-polos-hitam',
      sku: 'KPH-001',
      description: 'Kaos polos bahan katun combed',
      category_id: '',
      is_active: 'ya',
      variant_name: 'Size S',
      variant_sku: 'KPH-S-001',
      price: 85000,
      stock: 10,
      size: 'S',
      color: 'Hitam',
    },
    {
      product_name: '',
      slug: '',
      sku: '',
      description: '',
      category_id: '',
      is_active: '',
      variant_name: 'Size M',
      variant_sku: 'KPH-M-001',
      price: 85000,
      stock: 15,
      size: 'M',
      color: 'Hitam',
    },
    {
      product_name: 'Celana Cargo Olive',
      slug: 'celana-cargo-olive',
      sku: 'CCO-001',
      description: 'Celana cargo panjang warna olive',
      category_id: '',
      is_active: 'ya',
      variant_name: 'Size 30',
      variant_sku: 'CCO-30-001',
      price: 150000,
      stock: 5,
      size: '30',
      color: 'Olive',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template-import-produk-store.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ─── PARSE IMPORT ─────────────────────────────────────────────────────────────

export function parseStoreProductsFromFile(file: File): Promise<ProductDraft[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const content = e.target!.result;
        let wb: XLSX.WorkBook;

        if (typeof content === 'string' || file.name.toLowerCase().endsWith('.csv')) {
          wb = XLSX.read(content as string, { type: 'string', raw: false });
        } else {
          const data = new Uint8Array(content as ArrayBuffer);
          wb = XLSX.read(data, { type: 'array', raw: false });
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const products: ProductDraft[] = [];
        let currentProduct: ProductDraft | null = null;

        raw.forEach((row) => {
          const productName = String(row['product_name'] ?? '').trim();
          const variantSku = String(row['variant_sku'] ?? row['sku'] ?? '').trim();
          const variantName = String(row['variant_name'] ?? '').trim();

          if (productName) {
            currentProduct = {
              name: productName,
              slug: String(row['slug'] ?? '').trim() ||
                productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
              description: String(row['description'] ?? '').trim(),
              category_id: row['category_id'] ? Number(row['category_id']) : null,
              sku: String(row['sku'] ?? '').trim(),
              is_active: String(row['is_active'] ?? 'ya').trim().toLowerCase() !== 'tidak',
              variants: [],
            };
            products.push(currentProduct);
          }

          if (variantSku && currentProduct) {
            const variant: ProductVariantDraft = {
              name: variantName || 'Default',
              sku: variantSku,
              price: String(Number(row['price']) || 0),
              stock: Number(row['stock']) || 0,
              size: String(row['size'] ?? '').trim() || undefined,
              color: String(row['color'] ?? '').trim() || undefined,
            };
            currentProduct.variants.push(variant);
          }
        });

        for (const p of products) {
          if (p.variants.length === 0) {
            p.variants.push({
              name: 'Default',
              sku: p.sku || `${p.slug}-default`,
              price: '0',
              stock: 0,
            });
          }
        }

        if (products.length === 0) {
          throw new Error('Tidak ada produk valid di file. Pastikan kolom product_name tidak kosong.');
        }

        resolve(products);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Gagal parse file: ${message}`));
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file, 'utf-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
