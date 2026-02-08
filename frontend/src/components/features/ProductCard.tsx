import { Link } from 'react-router';
import { resolveImageUrl } from '@/lib/image';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/products/${product.id}`} className="group">
      {product.images?.[0] ? (
        <div className="aspect-[3/4] overflow-hidden bg-neutral-200">
          <img
            src={resolveImageUrl(product.images[0])}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
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
          ${Number(product.price).toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
