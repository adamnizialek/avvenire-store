import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AdminRoute from '@/components/layout/AdminRoute';
import Home from '@/pages/Home';
import { useAuthStore } from '@/stores/authStore';

const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Success = lazy(() => import('@/pages/Success'));
const OrderHistory = lazy(() => import('@/pages/OrderHistory'));
const NewArrivals = lazy(() => import('@/pages/NewArrivals'));
const Shipping = lazy(() => import('@/pages/Shipping'));
const Contact = lazy(() => import('@/pages/Contact'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Returns = lazy(() => import('@/pages/Returns'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new-arrivals" element={<NewArrivals />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
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
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
