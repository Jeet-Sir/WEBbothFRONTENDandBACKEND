"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authWithGoogleCode, restoreSession } from "@/lib/api";
import { UserProfile } from "@/lib/types";

const TOKEN_KEY = 'sabapplier_token';
const EXTENSION_TOKEN_KEY = 'sabapplier_extension_jwt';
const EXTENSION_USER_KEY = 'sabapplier_extension_user';
const EXTENSION_SYNC_TS_KEY = 'sabapplier_extension_sync_timestamp';
const EXTENSION_LOGIN_KEY = 'sabapplier_extension_login';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function persistAuthResult(authResult: { token: string; user: UserProfile }) {
  localStorage.setItem(TOKEN_KEY, authResult.token);
  localStorage.setItem(EXTENSION_TOKEN_KEY, authResult.token);
  localStorage.setItem(EXTENSION_USER_KEY, JSON.stringify(authResult.user));
  localStorage.setItem(EXTENSION_SYNC_TS_KEY, Date.now().toString());
  localStorage.setItem(EXTENSION_LOGIN_KEY, Date.now().toString());
  window.dispatchEvent(new CustomEvent('sabapplier-website-login'));
}

export default function SigninPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isGoogleClientReady, setIsGoogleClientReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const forceAuth = searchParams.get('force_auth') === '1';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (forceAuth) {
      setIsCheckingSession(false);
      return;
    }

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      router.replace('/');
      return;
    }

    let cancelled = false;

    restoreSession()
      .then((authResult) => {
        if (cancelled) return;
        persistAuthResult(authResult);
        router.replace('/');
      })
      .catch(() => {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [forceAuth, router]);

  useEffect(() => {
    if (!googleClientId) return;

    const initialize = () => {
      if (!window.google?.accounts?.oauth2) return;
      codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (response: any) => {
          setIsAuthenticating(true);
          try {
            if (response.error || !response.code) {
              throw new Error(response.error || 'Google authorization failed');
            }
            const authResult = await authWithGoogleCode(response.code);
            persistAuthResult(authResult);
            router.replace('/');
          } catch (error) {
            console.error('Login failed', error);
            setIsAuthenticating(false);
          }
        },
      });
      setIsGoogleClientReady(true);
    };

    if (window.google?.accounts?.oauth2) {
      initialize();
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [googleClientId, router]);

  const handleGoogleSignin = () => {
    if (codeClientRef.current) {
      codeClientRef.current.requestCode();
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white/95 shadow-2xl shadow-blue-900/10 backdrop-blur-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#2f56c0] to-[#3f67d1] px-7 py-7 text-white text-center">
          <div className="mx-auto mb-3 relative h-12 w-12 rounded-2xl border border-white/30 bg-white/20 overflow-hidden">
            <Image
              src="/logo.jpeg"
              alt="SabApplier AI"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome Back!</h1>
          <p className="text-sm text-[#dfe8ff] mt-1">
            Sign in with Google to access your SabApplier vault
          </p>
        </div>

        <div className="p-7 space-y-5">
          <Button
            onClick={handleGoogleSignin}
            disabled={!isGoogleClientReady || isAuthenticating || isCheckingSession}
            className="w-full h-12 bg-white text-[#0f172a] border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50"
            variant="outline"
          >
            {isAuthenticating ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
            ) : (
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-6.9 0-.7-.1-1.5-.2-2.2H12z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.4-4H3.4v2.5C5 19.9 8.2 22 12 22z"
                />
                <path
                  fill="#4A90E2"
                  d="M6.6 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1V7.4H3.4C2.5 9 2 10.5 2 12s.5 3 1.4 4.6l3.2-2.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 5.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.8 2.9 14.6 2 12 2 8.2 2 5 4.1 3.4 7.4l3.2 2.5c.7-2.3 2.9-4 5.4-4z"
                />
              </svg>
            )}
            {isAuthenticating ? 'Authenticating...' : 'Sign in with Google'}
          </Button>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Secure login
            </div>
            <p className="mt-1 text-blue-800/80">
              We only use your Google account for authentication and profile setup.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center text-sm text-[#2f56c0] hover:text-[#1f3f7a] font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
