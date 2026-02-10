import { useState, useEffect, useRef } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/image';
import type { Product } from '@/types';

const SIZE_PRESETS: Record<string, string[]> = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  accessories: ['One Size'],
};

interface AdminProductFormProps {
  product: Product | null;
  onSave: () => void;
}

export default function AdminProductForm({
  product,
  onSave,
}: AdminProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [manualUrl, setManualUrl] = useState('');
  const [stripePriceId, setStripePriceId] = useState(
    product?.stripePriceId || '',
  );
  const [category, setCategory] = useState(product?.category || 'clothing');
  const [inventory, setInventory] = useState<{ size: string; quantity: number }[]>(
    product?.inventory || [],
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!product) {
      const presets = SIZE_PRESETS[category] || [];
      setInventory(presets.map((size) => ({ size, quantity: 10 })));
    }
  }, [category, product]);

  const updateQuantity = (size: string, quantity: number) => {
    setInventory((prev) =>
      prev.map((inv) => (inv.size === size ? { ...inv, quantity } : inv)),
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<{ url: string }>('/products/upload', formData, {
          headers: { 'Content-Type': undefined },
        });
        setImages((prev) => [...prev, res.data.url]);
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualUrl = () => {
    if (manualUrl.trim()) {
      setImages((prev) => [...prev, manualUrl.trim()]);
      setManualUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = {
      name,
      description,
      price: parseFloat(price),
      images,
      stripePriceId: stripePriceId || null,
      category,
      inventory,
    };

    try {
      if (product) {
        await api.patch(`/products/${product.id}`, data);
      } else {
        await api.post('/products', data);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const resolveUrl = resolveImageUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="clothing">Clothing</option>
          <option value="shoes">Shoes</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Inventory (Size / Quantity)</Label>
        <div className="space-y-2">
          {inventory.map((inv) => (
            <div key={inv.size} className="flex items-center gap-3">
              <span className="w-16 text-sm font-medium">{inv.size}</span>
              <Input
                type="number"
                min="0"
                value={inv.quantity}
                onChange={(e) =>
                  updateQuantity(inv.size, Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">pcs</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Product Images</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="group/img relative">
                <img
                  src={resolveUrl(url)}
                  alt={`Image ${i + 1}`}
                  className="h-24 w-24 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload Images'}
        </Button>

        {/* Manual URL input */}
        <div className="flex gap-2">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Or paste image URL..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addManualUrl();
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addManualUrl}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stripePriceId">Stripe Price ID (optional)</Label>
        <Input
          id="stripePriceId"
          value={stripePriceId}
          onChange={(e) => setStripePriceId(e.target.value)}
          placeholder="price_..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
}
