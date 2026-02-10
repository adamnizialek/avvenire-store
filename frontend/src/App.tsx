import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AdminRoute from '@/components/layout/AdminRoute';
import Home from '@/pages/Home';
import Products from '@/pages/Products';
import ProductDetail from '@/pages/ProductDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Success from '@/pages/Success';
import OrderHistory from '@/pages/OrderHistory';
import NewArrivals from '@/pages/NewArrivals';
import Shipping from '@/pages/Shipping';
import Contact from '@/pages/Contact';
import FAQ from '@/pages/FAQ';
import Returns from '@/pages/Returns';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import AdminProducts from '@/pages/admin/AdminProducts';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new-arrivals" element={<NewArrivals />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="cart" element={<Cart />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="returns" element={<Returns />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="success" element={<Success />} />

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<OrderHistory />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="admin/products" element={<AdminProducts />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
