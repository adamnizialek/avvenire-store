import { Link } from 'react-router';
import { Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-400">
      <div className="px-8 py-12 md:py-16">
        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {/* Information */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              Information
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/shipping" className="transition-colors hover:text-white">
                  Shipping
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition-colors hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" className="transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/returns" className="transition-colors hover:text-white">
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              Terms &amp; Conditions
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/terms" className="transition-colors hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-4 text-xl font-bold tracking-wider text-white">
              AVVENIRE
            </p>
            <a
              href="https://www.instagram.com/avvenire.vision/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Instagram"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px bg-neutral-800" />

        {/* Payment icons */}
        <div className="flex flex-wrap gap-2">
          {['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'PayPal', 'Klarna'].map(
            (method) => (
              <span
                key={method}
                className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400"
              >
                {method}
              </span>
            ),
          )}
        </div>

        {/* Copyright */}
        <p className="mt-8 text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} AVVENIRE. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
