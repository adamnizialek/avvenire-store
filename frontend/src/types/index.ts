export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  availableSizes: string[];
  images: string[];
  stripePriceId: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  size: string | null;
  product: Product;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  stripeSessionId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  size: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
