import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/features/ProductCard';
import api from '@/lib/axios';
import type { Product } from '@/types';

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then((res) => setFeatured(res.data.slice(0, 4)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [featured]);

  return (
    <div>
      {/* Hero Section with Video — full screen */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <video
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/landing.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
        <p className="absolute top-[20%] left-1/2 z-10 -translate-x-1/2 animate-[fadeDown_1.5s_ease-out] text-sm font-light uppercase tracking-[0.3em] text-white/70 sm:top-[20%] sm:text-2xl sm:tracking-[0.5em]">
          Welcome to
        </p>
        <div className="relative z-10 mt-20 text-center text-white sm:mt-44">
          <h1 className="animate-[fadeUp_1.2s_ease-out_0.3s_both] text-6xl font-bold uppercase tracking-[0.15em] [text-shadow:0_0_40px_rgba(255,255,255,0.3),0_0_80px_rgba(255,255,255,0.1)] sm:text-8xl">
            <span className="animate-[shimmer_8s_ease-in-out_1.5s_infinite] bg-[length:200%_100%] bg-gradient-to-r from-neutral-400 via-white via-50% to-neutral-400 bg-clip-text text-transparent">
              AVVENIRE
            </span>
          </h1>
<Button size="lg" className="mt-64 animate-[fadeUp_1.2s_ease-out_0.8s_both] px-12 py-4 text-base sm:mt-36 sm:px-24 sm:py-6 sm:text-lg" asChild>
            <Link to="/products">
              Shop All
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Scroll indicator */}
        <button
          type="button"
          onClick={() =>
            sectionRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/70 transition-colors hover:text-white"
          aria-label="Scroll down"
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      </section>

      {/* Featured Products — fade-in on scroll */}
      {featured.length > 0 && (
        <section
          ref={sectionRef}
          className={`relative bg-neutral-50 py-12 transition-all duration-700 ease-out ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-12 opacity-0'
          }`}
        >
          {/* Subtle gradient top edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          <div className="mx-auto max-w-sm px-4 sm:max-w-none sm:px-4 lg:container">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-light tracking-wide text-neutral-900 sm:text-4xl">
                Our Picks
              </h2>
              <Button variant="ghost" asChild>
                <Link to="/products">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product, i) => (
                <div
                  key={product.id}
                  className="group transition-all duration-500 ease-out"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible
                      ? 'translateY(0)'
                      : 'translateY(2rem)',
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Subtle gradient bottom edge */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
        </section>
      )}
    </div>
  );
}
