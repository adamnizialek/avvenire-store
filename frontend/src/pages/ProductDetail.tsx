import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cartStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { formatPrice } from '@/lib/currency';
import ProductCard from '@/components/features/ProductCard';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/image';
import { toast } from 'sonner';
import type { Product } from '@/types';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [stockError, setStockError] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const addItem = useCartStore((state) => state.addItem);
  const currency = useCurrencyStore((state) => state.currency);

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedSize(null);
    setSizeError(false);
    setStockError(false);
    if (id) {
      api
        .get<Product>(`/products/${id}`)
        .then((res) => setProduct(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      api
        .get<Product[]>('/products')
        .then((res) => {
          const others = res.data.filter((p) => p.id !== id);
          setRelatedProducts(others.slice(0, 4));
        })
        .catch(() => {});
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="ghost" className="mt-4" asChild>
          <Link to="/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  const hasSizes = product.inventory && product.inventory.length > 0;
  const images = product.images ?? [];

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    setStockError(false);
    const invEntry = product.inventory.find((inv) => inv.size === selectedSize);
    const added = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: images[0] ?? null,
      size: selectedSize,
      maxQuantity: invEntry?.quantity,
    });
    if (!added) {
      setStockError(true);
      toast.error('All available stock for this size is already in your cart.');
    } else {
      toast.success(`${product.name} added to cart`);
    }
  };

  return (
    <div>
      <div className="px-4 py-2">
        <Button variant="ghost" className="mb-0" asChild>
          <Link to="/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-0">
        {/* Image collage - left side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-200">
          {images.length > 0 ? (
            images.map((img, i) => (
              <div key={i} className="bg-neutral-100">
                <img
                  src={resolveImageUrl(img)}
                  alt={`${product.name} ${i + 1}`}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 flex aspect-[3/4] items-center justify-center bg-neutral-100">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>

        {/* Product info - right side, sticky */}
        <div className="p-4 pt-6 md:self-start md:sticky md:top-0 md:p-8 md:pt-12">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-3 text-xl font-bold">
            {formatPrice(Number(product.price), currency)}
          </p>
          <Separator className="my-5" />
          <p className="text-sm text-muted-foreground">{product.description}</p>

          {hasSizes && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium">
                Size{' '}
                {sizeError && (
                  <span className="text-destructive">— Please select a size</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.inventory.map((inv) => {
                  const soldOut = inv.quantity === 0;
                  return (
                    <button
                      key={inv.size}
                      onClick={() => {
                        if (!soldOut) {
                          setSelectedSize(inv.size);
                          setSizeError(false);
                        }
                      }}
                      disabled={soldOut}
                      className={`flex h-10 min-w-[3rem] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                        soldOut
                          ? 'border-input bg-muted text-muted-foreground line-through cursor-not-allowed opacity-50'
                          : selectedSize === inv.size
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {inv.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button size="lg" className="mt-8 w-full" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
          {stockError && (
            <p className="mt-2 text-sm text-destructive">
              All available stock for this size is already in your cart.
            </p>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="px-4 py-12 md:px-8 md:py-16">
          <h2 className="mb-8 text-center text-lg font-medium uppercase tracking-widest">
            You may also like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
