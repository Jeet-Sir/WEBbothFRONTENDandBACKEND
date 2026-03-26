"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardTab, UserProfile } from '@/lib/types';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Navbar } from '@/components/dashboard/Navbar';
import { Home } from '@/components/dashboard/Home';
import { Activity } from '@/components/dashboard/Activity';
import { Vault } from '@/components/dashboard/Vault';
import { Profile } from '@/components/dashboard/Profile';
import { Shield, Sparkles, Loader2 } from 'lucide-react';
import { authWithGoogleCode, deleteProfile, fetchProfile, logoutSession, restoreSession, saveProfile } from '@/lib/api';
import LandingPage from '@/components/landing/LandingPage';

const TOKEN_KEY = 'sabapplier_token';
const EXTENSION_TOKEN_KEY = 'sabapplier_extension_jwt';
const EXTENSION_USER_KEY = 'sabapplier_extension_user';
const EXTENSION_SYNC_TS_KEY = 'sabapplier_extension_sync_timestamp';
const EXTENSION_LOGIN_KEY = 'sabapplier_extension_login';
const EXTENSION_LOGOUT_KEY = 'sabapplier_extension_logout';
const EXTENSION_LOGOUT_TS_KEY = 'sabapplier_extension_logout_timestamp';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup';
            callback: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

function persistAuthResult(authResult: { token: string; user: UserProfile }) {
  localStorage.setItem(TOKEN_KEY, authResult.token);
  localStorage.setItem(EXTENSION_TOKEN_KEY, authResult.token);
  localStorage.setItem(EXTENSION_USER_KEY, JSON.stringify(authResult.user));
  localStorage.setItem(EXTENSION_SYNC_TS_KEY, Date.now().toString());
  localStorage.setItem(EXTENSION_LOGIN_KEY, Date.now().toString());
  window.dispatchEvent(new CustomEvent('sabapplier-website-login'));
}

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => (pathname === '/dashboard' ? 'activity' : 'home'));
  const [profileEditIntent, setProfileEditIntent] = useState<'none' | 'founder'>('none');
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleClientReady, setIsGoogleClientReady] = useState(false);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;

    const initialize = () => {
      if (!window.google?.accounts?.oauth2) return;
      codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (response) => {
          try {
            if (response.error || !response.code) {
              throw new Error(response.error || 'Google authorization failed');
            }
            const authResult = await authWithGoogleCode(response.code);
            persistAuthResult(authResult);
            setToken(authResult.token);
            setProfile(authResult.user);
          } catch (error) {
            console.error('Login failed', error);
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
  }, [googleClientId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
      setLoading(false);
      return;
    }

    let cancelled = false;

    restoreSession()
      .then((authResult) => {
        if (cancelled) return;
        persistAuthResult(authResult);
        setToken(authResult.token);
        setProfile(authResult.user);
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTokenFromStorage = () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored !== token) {
        setToken(stored);
      }
    };

    syncTokenFromStorage();
    const intervalId = window.setInterval(syncTokenFromStorage, 1500);
    const onFocus = () => syncTokenFromStorage();
    const onAuthSync = () => syncTokenFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === 'sabapplier_extension_jwt') {
        syncTokenFromStorage();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('sabapplier-auth-sync', onAuthSync as EventListener);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sabapplier-auth-sync', onAuthSync as EventListener);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchProfile(token)
      .then((res) => {
        if (!cancelled) {
          setProfile(res.user);
          // Ensure extension data is fresh on profile fetch
          localStorage.setItem(EXTENSION_USER_KEY, JSON.stringify(res.user));
          localStorage.setItem(EXTENSION_SYNC_TS_KEY, Date.now().toString());
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);

          // Clear Extension Sync Data
          localStorage.removeItem(EXTENSION_TOKEN_KEY);
          localStorage.removeItem(EXTENSION_USER_KEY);
          localStorage.removeItem(EXTENSION_SYNC_TS_KEY);

          setToken(null);
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogin = () => {
    if (codeClientRef.current) {
      codeClientRef.current.requestCode();
    } else {
      router.push('/signin');
    }
  };

  const handleSignup = () => {
    if (codeClientRef.current) {
      codeClientRef.current.requestCode();
    } else {
      router.push('/signup');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch (error) {
      console.error('Failed to clear website session cookie', error);
    }

    localStorage.removeItem(TOKEN_KEY);

    // Clear Extension Sync Data
    localStorage.removeItem(EXTENSION_TOKEN_KEY);
    localStorage.removeItem(EXTENSION_USER_KEY);
    localStorage.removeItem(EXTENSION_SYNC_TS_KEY);

    // Set logout flag for extension (so background sync clears extension auth)
    localStorage.setItem(EXTENSION_LOGOUT_KEY, 'true');
    localStorage.setItem(EXTENSION_LOGOUT_TS_KEY, Date.now().toString());

    // Notify extension immediately so it logs out without waiting for 30s poll
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sabapplier-website-logout'));
    }

    // Remove logout flag after delay (fallback cleanup; extension also clears them when it processes)
    setTimeout(() => {
      localStorage.removeItem(EXTENSION_LOGOUT_KEY);
      localStorage.removeItem(EXTENSION_LOGOUT_TS_KEY);
    }, 5000);

    setToken(null);
    setProfile(null);
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    try {
      await deleteProfile(token);
    } catch (error) {
      console.error('Failed to delete account', error);
      return;
    }

    try {
      await logoutSession();
    } catch (error) {
      console.error('Failed to clear website session cookie after account deletion', error);
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXTENSION_TOKEN_KEY);
    localStorage.removeItem(EXTENSION_USER_KEY);
    localStorage.removeItem(EXTENSION_SYNC_TS_KEY);

    localStorage.setItem(EXTENSION_LOGOUT_KEY, 'true');
    localStorage.setItem(EXTENSION_LOGOUT_TS_KEY, Date.now().toString());

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sabapplier-website-logout'));
    }

    setTimeout(() => {
      localStorage.removeItem(EXTENSION_LOGOUT_KEY);
      localStorage.removeItem(EXTENSION_LOGOUT_TS_KEY);
    }, 5000);

    setToken(null);
    setProfile(null);
  };

  const persistUser = async (updated: UserProfile) => {
    if (!token) return;
    setProfile(updated);
    try {
      const {
        userId: _userId,
        googleId: _googleId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...mutablePatch
      } = updated as any; // Cast to any to handle extra fields from backend
      const saved = await saveProfile(token, mutablePatch);
      setProfile(saved.user);
    } catch (error) {
      console.error('Failed to save profile', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!token || !profile) {
    return <LandingPage onLogin={handleLogin} onSignup={handleSignup} />;
  }

  if (!profile.onboardingComplete) {
    return (
      <OnboardingWizard
        userId={profile.userId}
        authToken={token}
        user={profile}
        saveUser={persistUser}
      />
    );
  }

  return (
    <div className="min-h-screen dashboard-shell">
      <Navbar
        user={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {activeTab === 'home' && <Home user={profile} />}
        {activeTab === 'activity' && <Activity authToken={token} />}
        {activeTab === 'documents' && (
          <Vault
            authToken={token}
            user={profile}
            saveUser={persistUser}
            onEditFounderDetails={() => {
              setProfileEditIntent('founder');
              setActiveTab('profile');
            }}
          />
        )}
        {activeTab === 'profile' && (
          <Profile
            user={profile}
            saveUser={persistUser}
            onDeleteAccount={handleDeleteAccount}
            autoOpenFounderEditor={profileEditIntent === 'founder'}
            onAutoOpenHandled={() => setProfileEditIntent('none')}
          />
        )}
        {activeTab === 'sharing' && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 dashboard-muted-card rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-primary">Data Sharing Coming Soon</h2>
            <p className="text-muted-foreground max-w-sm">
              Securely share your verified vault data with universities, employers, and banks with a single OTP.
            </p>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-[#1f3f7a]/70 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" /> Sabapplier AI Identity Vault
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Security</a>
          <a href="#" className="hover:text-primary transition-colors">Help</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
