import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cartStore';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/image';
import type { Product } from '@/types';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [sizeError, setSizeError] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (id) {
      api
        .get<Product>(`/products/${id}`)
        .then((res) => setProduct(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
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

  const hasSizes =
    product.availableSizes && product.availableSizes.length > 0;
  const hasImages = product.images && product.images.length > 0;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images?.[0] ?? null,
      size: selectedSize,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-6" asChild>
        <Link to="/products">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div>
          {hasImages ? (
            <>
              <div className="overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src={resolveImageUrl(product.images[selectedImage])}
                  alt={product.name}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        selectedImage === i
                          ? 'border-primary'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={resolveImageUrl(img)}
                        alt={`${product.name} ${i + 1}`}
                        className="h-20 w-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>

        <div>
          <Badge variant="secondary" className="mb-2 capitalize">
            {product.category}
          </Badge>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold">
            ${Number(product.price).toFixed(2)}
          </p>
          <Separator className="my-6" />
          <p className="text-muted-foreground">{product.description}</p>

          {/* Size Selector */}
          {hasSizes && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium">
                Size{' '}
                {sizeError && (
                  <span className="text-destructive">— Please select a size</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      setSizeError(false);
                    }}
                    className={`flex h-10 min-w-[3rem] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button size="lg" className="mt-8" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
