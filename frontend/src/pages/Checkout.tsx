import { useState } from 'react';
import { useNavigate } from 'react-router';
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
import api from '@/lib/axios';

export default function Checkout() {
  const { items, getTotalPrice } = useCartStore();
  const currency = useCurrencyStore((state) => state.currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create order
      const orderResponse = await api.post('/orders', {
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          size: item.size,
        })),
      });

      // 2. Create Stripe checkout session
      const stripeResponse = await api.post('/stripe/create-checkout-session', {
        orderId: orderResponse.data.id,
      });

      // 3. Redirect to Stripe
      window.location.href = stripeResponse.data.url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
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
        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {loading ? 'Processing...' : 'Pay with Stripe'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
