import { Link } from 'react-router';
import { resolveImageUrl } from '@/lib/image';
import { useCurrencyStore } from '@/stores/currencyStore';
import { formatPrice } from '@/lib/currency';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const hasSecondImage = product.images?.length >= 2;

  return (
    <Link to={`/products/${product.id}`} className="group">
      {product.images?.[0] ? (
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-200">
          <img
            src={resolveImageUrl(product.images[0])}
            alt={product.name}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              hasSecondImage ? 'group-hover:opacity-0' : ''
            }`}
          />
          {hasSecondImage && (
            <img
              src={resolveImageUrl(product.images[1])}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </div>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center bg-neutral-200">
          <span className="text-sm text-neutral-400">No image</span>
        </div>
      )}
      <div className="pt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-neutral-600">
          {formatPrice(Number(product.price), currency)}
        </p>
      </div>
    </Link>
  );
}
