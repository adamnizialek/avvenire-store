import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { formatPrice } from '@/lib/currency';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';
import type { Order } from '@/types';

/**
 * GDPR self-service (referenced from the Privacy Policy): download a copy of
 * your data, or delete (anonymize) your account. Deletion asks for the
 * current password so a borrowed session can't destroy the account.
 */
function PrivacyAndData() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      const res = await api.get<unknown>('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'avvenire-data-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed. Please try again.'));
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.delete('/users/me', { data: { password } });
      await logout();
      toast.success('Your account has been deleted.');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete your account.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle className="text-base">Privacy &amp; data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Download a copy of your personal data and order history (JSON).</p>
          <Button variant="outline" size="sm" onClick={() => void handleExport()}>
            Download my data
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Permanently delete your account. Order records are kept in
            anonymized form for the legally required retention period.
          </p>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete my account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. Your email and login are erased
                  immediately; past orders are kept without any link to you, as
                  required by tax law. Enter your password to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!password || busy}
                  onClick={() => void handleDelete()}
                >
                  {busy ? 'Deleting…' : 'Delete account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setError(true))
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

      {error ? (
        <p className="text-center text-destructive">
          Failed to load your orders. Please refresh to try again.
        </p>
      ) : orders.length === 0 ? (
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
                    {formatPrice(Number(order.totalAmount), 'USD')}
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
                        {formatPrice(Number(item.price) * item.quantity, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PrivacyAndData />
    </div>
  );
}
