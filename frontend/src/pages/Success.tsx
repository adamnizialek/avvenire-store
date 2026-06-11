import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import api from '@/lib/axios';

type Status = 'loading' | 'success' | 'processing' | 'invalid';

export default function Success() {
  const clearCart = useCartStore((state) => state.clearCart);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  // No Stripe session → 'invalid' immediately, without clearing the cart or
  // claiming a payment happened. Computed here to avoid a setState in the effect.
  const [status, setStatus] = useState<Status>(sessionId ? 'loading' : 'invalid');

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    api
      .get<{ id: string; status: string }>(`/orders/session/${sessionId}`)
      .then((res) => {
        if (cancelled) return;
        // The order exists for this session: it's placed, so the cart can clear.
        clearCart();
        setStatus(res.data.status === 'completed' ? 'success' : 'processing');
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, clearCart]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        <p className="mt-4 text-muted-foreground">Confirming your payment…</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <XCircle className="h-20 w-20 text-muted-foreground" />
        <h1 className="mt-6 text-3xl font-bold">No payment found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't find a payment for this page.
        </p>
        <div className="mt-8 flex gap-4">
          <Button asChild>
            <Link to="/cart">Back to Cart</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const processing = status === 'processing';

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {processing ? (
        <Clock className="h-20 w-20 text-amber-500" />
      ) : (
        <CheckCircle className="h-20 w-20 text-green-500" />
      )}
      <h1 className="mt-6 text-3xl font-bold">
        {processing ? 'Payment Processing' : 'Payment Successful!'}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {processing
          ? 'Your payment is being processed. We’ll confirm your order shortly.'
          : 'Thank you for your purchase. Your order has been confirmed.'}
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link to="/orders">View My Orders</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
