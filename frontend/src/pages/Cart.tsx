import { Link } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { resolveImageUrl } from '@/lib/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { formatPrice } from '@/lib/currency';

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const { token } = useAuthStore();
  const currency = useCurrencyStore((state) => state.currency);

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">
          Add some products to get started.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Shopping Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.size ?? ''}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4"
              >
                {item.imageUrl ? (
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.name}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
                    <span className="text-xs text-muted-foreground">
                      No img
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  {item.size && (
                    <p className="text-sm text-muted-foreground">
                      Size: {item.size}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(Number(item.price), currency)} each
                  </p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity(item.id, item.size, item.quantity - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                      onClick={() =>
                        updateQuantity(item.id, item.size, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {item.maxQuantity !== undefined && item.quantity >= item.maxQuantity && (
                    <span className="text-xs text-destructive">Max stock reached</span>
                  )}
                </div>

                <p className="hidden w-20 text-right font-medium sm:block">
                  {formatPrice(Number(item.price) * item.quantity, currency)}
                </p>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id, item.size)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(getTotalPrice(), currency)}</span>
          </div>
          <Button className="mt-6 w-full" size="lg" asChild>
            <Link to={token ? '/checkout' : '/login'}>
              {token ? 'Proceed to Checkout' : 'Login to Checkout'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
