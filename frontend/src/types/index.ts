export interface TicketData {
  id: number;
  slug: string;
  name: string;
  type: string;
  price: string;
  description: string | null;
  available_from: string;
  available_until: string;
  time_slots?: string[] | null;
  is_active: boolean;
}

export interface AboutItem {
  icon: string;
  title: string;
  description: string;
}

export interface CollectionItem {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface ProductRetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  price: number;
  stock: number;
  weight: number;
  length: number | null;
  width: number | null;
  height: number | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  retail_category: "glam" | "charmbar" | "sparkclub" | null;
  retail_category_id: number | null;
  retail_subcategory_id: number | null;
  variant: string | null;
  imageUrls?: string[];
  product_retail_images?:
    | {
        image_url: string;
        is_primary: boolean;
        display_order: number;
      }[]
    | null;
  // Relasi opsional — tersedia jika di-select dengan JOIN
  categories?: {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
  retail_categories?: {
    id: number;
    department: string;
    name: string;
    slug: string;
  } | null;
}

export interface StockOpname {
  id: number;
  opname_number: string;
  location: string;
  transaction_date: string;
  transaction_type: "stock_in" | "stock_out" | "adjustment";
  reason: string | null;
  notes: string | null;
  opname_start_date?: string;
  opname_end_date?: string;
  status?: 'draft' | 'finalized';
  created_by: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface StockOpnameItem {
  id: number;
  stock_opname_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  variant_id: number;
  variant_name: string;
  variant_sku: string;
  quantity_before: number;
  quantity_sold: number;
  quantity_expected: number;
  quantity_actual: number | null;
  quantity_discrepancy: number | null;
  discrepancy_reason: string | null;
  unit: string;
  cost_per_unit: number | null;
  created_at?: string;
}

export interface StockOpnameDetail extends StockOpname {
  items: StockOpnameItem[];
}

export interface StockOpnameFormData {
  location: string;
  transaction_date: string;
  transaction_type: "stock_in" | "stock_out" | "adjustment";
  reason: string;
  notes: string;
  opname_start_date: string;
  opname_end_date: string;
  items: {
    variant_id: number;
    quantity_before: number;
    quantity_actual?: number;
    unit: string;
    cost_per_unit?: number;
    discrepancy_reason?: string;
  }[];
}
