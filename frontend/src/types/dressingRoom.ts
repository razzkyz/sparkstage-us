/**
 * Types for Dressing Room Product System
 */

export type DressingRoomProductStatus = 'active' | 'inactive' | 'deleted';
export type RentalItemStatus = 'rented' | 'in_laundry' | 'damaged' | 'returned_pending' | 'returned' | 'lost' | 'hold';

export interface DressingRoomProduct {
  id: number;
  name: string;
  description: string | null;
  category: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DressingRoomProductVariant {
  id: number;
  dressing_room_product_id: number;
  name: string;
  sku: string;
  size_label: string | null;
  color: string | null;
  price: number;
  deposit_amount: number;
  daily_rental_fee: number;
  
  // Inventory
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  in_laundry_quantity: number;
  
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface RentalItemStatusHistoryEntry {
  id: number;
  rental_order_id: number;
  rental_order_item_id: number;
  status: RentalItemStatus;
  previous_status: RentalItemStatus | null;
  reason: string | null;
  notes: string | null;
  photo_urls: string[];
  created_at: string;
  created_by_email: string | null;
}

export interface RentalOrderItemWithStatus {
  id: number;
  rental_order_id: number;
  product_id: number | null;
  product_variant_id: number | null;
  dressing_room_product_variant_id: number | null;
  product_name: string;
  variant_name: string | null;
  current_status: RentalItemStatus;
  status_updated_at: string;
  product_price: number;
  deposit_amount: number;
  rental_cost: number;
  total_item_cost: number;
  return_condition: string | null;
  damage_deduction: number;
  deposit_refunded: number;
  created_at: string;
  updated_at: string;
}

export interface DressingRoomInventorySummary {
  product_id: number;
  product_name: string;
  variant_id: number;
  variant_name: string;
  sku: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  in_laundry_quantity: number;
  price: number;
  deposit_amount: number;
}
