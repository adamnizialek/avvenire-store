import { useEffect, useState } from 'react';
import ProductCard from '@/components/features/ProductCard';
import api from '@/lib/axios';
import type { Product } from '@/types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">All Products</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-center text-destructive">
          Failed to load products. Please refresh to try again.
        </p>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No products available yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
