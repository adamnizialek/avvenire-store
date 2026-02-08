import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShoppingCart, LogOut, User, Settings, ChevronDown, Menu } from 'lucide-react';
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
                <DropdownMenuItem onClick={() => navigate('/admin/products')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
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
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left text-lg tracking-wider">AVVENIRE</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              <SheetClose asChild>
                <Link to="/" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  Home
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/products" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  Shop All
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/products/new-arrivals" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  New Arrivals
                </Link>
              </SheetClose>

              <div className="my-2 h-px bg-border" />

              <div className="px-3 py-2">
                <CurrencySelector />
              </div>

              <div className="my-2 h-px bg-border" />

              {user ? (
                <>
                  <SheetClose asChild>
                    <Link to="/orders" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      My Orders
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/admin/products" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      Admin Panel
                    </Link>
                  </SheetClose>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-accent"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Link to="/login" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      Login
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/register" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      Register
                    </Link>
                  </SheetClose>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
