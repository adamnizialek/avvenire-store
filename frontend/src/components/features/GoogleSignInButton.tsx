import { useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';

// Google Identity Services. vercel.json's CSP allows exactly this script, its
// stylesheet and its iframe — keep them in step if this ever changes.
const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let gsiLoading: Promise<GoogleIdApi> | null = null;
// Google's library is initialized once per page load (it isn't meant to be
// re-initialized); its callback forwards to whichever button is mounted now.
let activeHandler: ((credential: string) => void) | null = null;

function loadGoogleIdentity(clientId: string): Promise<GoogleIdApi> {
  gsiLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      const google = window.google?.accounts.id;
      if (!google) {
        reject(new Error('Google sign-in did not load'));
        return;
      }
      google.initialize({
        client_id: clientId,
        callback: ({ credential }) => activeHandler?.(credential),
      });
      resolve(google);
    };
    script.onerror = () => {
      gsiLoading = null; // let a later visit retry
      reject(new Error('Google sign-in did not load'));
    };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

interface GoogleSignInButtonProps {
  /** Receives Google's ID token for the page to send to the backend. */
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/**
 * Google's own "Sign in with Google" button. Renders nothing until the
 * backend reports a client id, so it stays hidden where Google sign-in isn't
 * configured (local dev, or before GOOGLE_CLIENT_ID is set).
 */
export default function GoogleSignInButton({
  onCredential,
  text = 'signin_with',
}: GoogleSignInButtonProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  });

  useEffect(() => {
    const handler = (credential: string) => callback.current(credential);
    activeHandler = handler;
    return () => {
      if (activeHandler === handler) activeHandler = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ clientId: string | null }>('/auth/google/config')
      .then((res) => {
        if (!cancelled) setClientId(res.data.clientId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleIdentity(clientId)
      .then((google) => {
        const parent = container.current;
        if (cancelled || !parent) return;
        google.renderButton(parent, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          locale: 'en', // the store is English; Google would follow the visitor
          // Google's button is 200–400px wide; match the card when it fits.
          width: Math.max(200, Math.min(400, parent.offsetWidth)),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={container} className="flex min-h-10 w-full justify-center" />
    </div>
  );
}
