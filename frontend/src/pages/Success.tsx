import { Link } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Success() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
      <CheckCircle className="h-20 w-20 text-green-500" />
      <h1 className="mt-6 text-3xl font-bold">Payment Successful!</h1>
      <p className="mt-2 text-muted-foreground">
        Thank you for your purchase. Your order has been confirmed.
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
