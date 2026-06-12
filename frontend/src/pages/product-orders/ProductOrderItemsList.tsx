import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { toInventoryThumbUrl } from '../../utils/inventoryImage';
import type { ProductOrderItem } from './types';

type ProductOrderItemsListProps = {
  items: ProductOrderItem[];
};

export function ProductOrderItemsList({ items }: ProductOrderItemsListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const productHref = item.productId ? `/shop/product/${item.productId}` : null;
        const imageUrl = item.imageUrl ? toInventoryThumbUrl(item.imageUrl) : null;
        const imageBlock = (
          <div className="h-16 w-12 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img alt={item.productName} src={imageUrl} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="material-symbols-outlined text-gray-400">inventory_2</span>
            )}
          </div>
        );

        return (
          <div key={item.id} className="flex items-center gap-4">
            {productHref ? (
              <Link to={productHref} aria-label={`View ${item.productName}`}>
                {imageBlock}
              </Link>
            ) : (
              imageBlock
            )}
            <div className="min-w-0 flex-1">
              {productHref ? (
                <Link to={productHref} className="block truncate font-medium text-gray-900 hover:text-pink-600">
                  {item.productName}
                </Link>
              ) : (
                <p className="truncate font-medium text-gray-900">{item.productName}</p>
              )}
              <p className="truncate text-sm text-gray-500">
                {item.variantName} - {item.quantity} x {formatCurrency(item.price)}
              </p>
              {productHref && <p className="mt-1 text-xs font-medium text-pink-600">View / buy again</p>}
            </div>
            <span className="shrink-0 font-medium text-gray-900">{formatCurrency(item.subtotal)}</span>
          </div>
        );
      })}
    </div>
  );
}
