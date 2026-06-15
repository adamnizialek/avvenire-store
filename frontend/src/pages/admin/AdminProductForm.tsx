import { useState, useEffect, useRef } from 'react';
import { Upload, X, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/image';
import { getErrorMessage } from '@/lib/errors';
import type { Product, ProductImage } from '@/types';

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
  const [images, setImages] = useState<ProductImage[]>(product?.images || []);
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
  // Track whether the admin actually touched inventory, so an edit that only
  // changes (say) the name doesn't ship a stale stock snapshot that would
  // overwrite decrements made by concurrent checkouts.
  const [inventoryDirty, setInventoryDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When the category changes, re-map inventory to that category's sizes while
  // preserving any quantities already entered for matching sizes. New products
  // default unentered sizes to 10; edits default added sizes to 0 so existing
  // counts are never silently inflated.
  useEffect(() => {
    const presets = SIZE_PRESETS[category] || [];
    setInventory((prev) =>
      presets.map((size) => {
        const existing = prev.find((inv) => inv.size === size);
        if (existing) return existing;
        return { size, quantity: product ? 0 : 10 };
      }),
    );
  }, [category, product]);

  const updateQuantity = (size: string, quantity: number) => {
    setInventoryDirty(true);
    setInventory((prev) =>
      prev.map((inv) => (inv.size === size ? { ...inv, quantity } : inv)),
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    // Upload each file independently so one failure doesn't silently abort the
    // rest, and report which files failed (and why) instead of a generic error.
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<{ url: string }>(
          '/products/upload',
          formData,
          { headers: { 'Content-Type': undefined } },
        );
        setImages((prev) => [...prev, { url: res.data.url, alt: '' }]);
      } catch (err) {
        failures.push(`${file.name}: ${getErrorMessage(err, 'upload failed')}`);
      }
    }

    if (failures.length) {
      setError(`Some images failed to upload — ${failures.join('; ')}`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Reorder photos by swapping a photo with its neighbour. The first photo is the
  // product's primary image (drives the product card, cart thumbnail, and Stripe),
  // so moving a photo to the front is how the admin sets the primary. dir is -1
  // (earlier / toward primary) or +1 (later). No wraparound at the ends.
  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateAlt = (index: number, alt: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img)),
    );
  };

  const addManualUrl = () => {
    const url = manualUrl.trim();
    if (!url) return;
    if (!URL.canParse(url)) {
      setError('Please enter a valid image URL (including https://).');
      return;
    }
    setImages((prev) => [...prev, { url, alt: '' }]);
    setManualUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !description.trim()) {
      setError('Name and description cannot be empty.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (images.length === 0) {
      setError('Please add at least one product image.');
      return;
    }

    setLoading(true);

    const data: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      images,
      stripePriceId: stripePriceId || null,
      category,
    };
    // Only send inventory when creating, or when the admin actually edited it —
    // otherwise we'd clobber stock decremented by concurrent checkouts.
    if (!product || inventoryDirty) {
      data.inventory = inventory;
    }

    try {
      if (product) {
        await api.patch(`/products/${product.id}`, data);
      } else {
        await api.post('/products', data);
      }
      onSave();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save product'));
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
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          required
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown — use <code>## Heading</code>, <code>**bold**</code>,
          and <code>- bullet lists</code> to structure longer descriptions. A
          single Enter is a line break; leave a blank line between paragraphs for
          extra spacing.
        </p>
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
          onChange={(e) => {
            setInventoryDirty(true);
            setCategory(e.target.value);
          }}
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

        {/* Image previews + reorder controls. The first image is the product's
            primary (drives the card, cart thumbnail, and Stripe). Each image is a
            row: thumbnail, a vertical up/down move strip, then an alt-text input.
            Identical layout in create and edit mode. */}
        {images.length > 0 && (
          <div className="space-y-2">
            {images.map((img, i) => {
              const thumb = (
                <div className="group/img relative shrink-0">
                  <img
                    src={resolveUrl(img.url)}
                    alt={img.alt || `Image ${i + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );

              const moveEarlier = (
                <button
                  type="button"
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move image ${i + 1} earlier`}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              );

              const moveLater = (
                <button
                  type="button"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label={`Move image ${i + 1} later`}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              );

              // One row per image (create and edit alike): thumbnail, a vertical
              // move strip, then the alt-text input.
              return (
                <div key={i} className="flex items-start gap-3">
                  {thumb}
                  <div className="flex flex-col gap-1">
                    {moveEarlier}
                    {moveLater}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`alt-${i}`}
                      className="text-xs text-muted-foreground"
                    >
                      Alt text (optional)
                    </Label>
                    <Input
                      id={`alt-${i}`}
                      value={img.alt ?? ''}
                      onChange={(e) => updateAlt(i, e.target.value)}
                      placeholder="Describe this photo for screen readers"
                      maxLength={250}
                    />
                  </div>
                </div>
              );
            })}
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
