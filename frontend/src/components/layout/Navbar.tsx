import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShoppingCart, LogOut, User, Settings, ChevronDown, Menu, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import CurrencySelector from '@/components/features/CurrencySelector';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:h-20 md:px-8">
        {/* Left side: Logo + Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-wider md:text-2xl" onClick={() => window.scrollTo(0, 0)}>
            AVVENIRE
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/"
              className="text-base font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>

            <div className="group relative">
              <button className="flex items-baseline gap-1 text-base font-medium transition-colors hover:text-primary">
                Shop
                <ChevronDown className="h-3.5 w-3.5 translate-y-px transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
                  <Link
                    to="/products"
                    className="block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    All
                  </Link>
                  <Link
                    to="/products/new-arrivals"
                    className="block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    New Arrivals
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Right side: Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <CurrencySelector />
          <Link to="/cart" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {totalItems}
              </Badge>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  {user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/orders')}>
                  My Orders
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin/products')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Right side: Mobile */}
        <div className="flex items-center gap-4 md:hidden">
          <Link to="/cart" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {totalItems}
              </Badge>
            )}
          </Link>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="text-left text-xl font-bold tracking-wider">AVVENIRE</SheetTitle>
            </SheetHeader>

            <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pt-6">
              {/* Main navigation — bordered items */}
              <SheetClose asChild>
                <Link to="/" className="block rounded-sm border border-neutral-200 px-4 py-3.5 text-sm font-medium uppercase tracking-wider">
                  Home
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/products" className="block rounded-sm border border-neutral-200 px-4 py-3.5 text-sm font-medium uppercase tracking-wider">
                  Shop
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/products/new-arrivals" className="block rounded-sm border border-neutral-200 px-4 py-3.5 text-sm font-medium uppercase tracking-wider">
                  New Arrivals
                </Link>
              </SheetClose>

              {/* Secondary links — grouped box */}
              <div className="mt-2 rounded-sm border border-neutral-200">
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Link to="/orders" className="block border-b border-neutral-200 px-4 py-3 text-sm font-medium uppercase tracking-wider">
                        My Orders
                      </Link>
                    </SheetClose>
                    {user.role === 'admin' && (
                      <SheetClose asChild>
                        <Link to="/admin/products" className="block border-b border-neutral-200 px-4 py-3 text-sm font-medium uppercase tracking-wider">
                          Admin Panel
                        </Link>
                      </SheetClose>
                    )}
                    <button
                      onClick={() => { handleLogout(); setMobileOpen(false); }}
                      className="block w-full px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-destructive"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/login" className="block border-b border-neutral-200 px-4 py-3 text-sm font-medium uppercase tracking-wider">
                        Login
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/register" className="block px-4 py-3 text-sm font-medium uppercase tracking-wider">
                        Register
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>

              {/* Currency selector + Instagram */}
              <div className="mt-4 flex items-center gap-4">
                <CurrencySelector />
                <a
                  href="https://www.instagram.com/avvenire.vision/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-neutral-500 transition-colors hover:text-foreground" />
                </a>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
