import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import api from '@/lib/axios';
import { useCurrencyStore } from '@/stores/currencyStore';
import { formatPrice } from '@/lib/currency';
import type { Order } from '@/types';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const currency = useCurrencyStore((state) => state.currency);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">My Orders</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">My Orders</h1>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">
          You haven't placed any orders yet.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Order #{order.id.slice(0, 8)}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      order.status === 'completed' ? 'default' : 'secondary'
                    }
                  >
                    {order.status}
                  </Badge>
                  <span className="font-bold">
                    {formatPrice(Number(order.totalAmount), currency)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.product?.name || 'Product'} x {item.quantity}
                      </span>
                      <span>
                        {formatPrice(Number(item.price) * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
