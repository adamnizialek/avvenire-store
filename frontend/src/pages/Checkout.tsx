import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCartStore } from '@/stores/cartStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { formatPrice } from '@/lib/currency';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/axios';

export default function Checkout() {
  const { items, getTotalPrice } = useCartStore();
  const currency = useCurrencyStore((state) => state.currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Remember the created order so a retry of the Stripe step reuses it instead
  // of creating a second order (which would deduct stock twice).
  const createdOrderId = useRef<string | null>(null);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create the order once; reuse it on retry.
      if (!createdOrderId.current) {
        const orderResponse = await api.post('/orders', {
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            size: item.size,
          })),
        });
        createdOrderId.current = orderResponse.data.id;
      }

      // 2. Create Stripe checkout session
      const stripeResponse = await api.post('/stripe/create-checkout-session', {
        orderId: createdOrderId.current,
      });

      // 3. Redirect to Stripe
      window.location.href = stripeResponse.data.url;
    } catch (err) {
      setError(getErrorMessage(err, 'Checkout failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.id}-${item.size ?? ''}`} className="flex justify-between">
                <span>
                  {item.name}{item.size ? ` (${item.size})` : ''} x {item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(Number(item.price) * item.quantity, currency)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(getTotalPrice(), currency)}</span>
          </div>
          {currency !== 'USD' && (
            <p className="mt-2 text-xs text-muted-foreground">
              * You will be charged in USD. The {currency} amount is an estimate based on current exchange rates.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {loading ? 'Processing...' : 'Pay with Stripe'}
          </Button>
          {/* Consumer-law information duty: the order is placed with an
              obligation to pay, under the published terms. */}
          <p className="text-center text-xs text-muted-foreground">
            By paying you place an order with an obligation to pay and accept
            the{' '}
            <Link to="/terms" className="underline hover:text-foreground">
              Terms &amp; Conditions
            </Link>
            . See your{' '}
            <Link to="/returns" className="underline hover:text-foreground">
              14-day right of withdrawal
            </Link>{' '}
            and our{' '}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
