
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import LoadingLogo from './loading-logo';
import { auth } from '@/lib/firebase';
import { getBusinessProfile } from '@/lib/firestore';
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  const isPublicPage = pathname === '/login' || pathname.startsWith('/receipts/verify');

  useEffect(() => {
    // Standard Firebase Auth listener. 
    // It handles the initial load and any subsequent sign-in/out events.
    const unsubscribe = onIdTokenChanged(auth, async (newUser) => {
      try {
        if (newUser) {
          const idToken = await newUser.getIdToken();
          // Sync session with the server
          await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
        } else {
          // Clear session on the server
          await fetch('/api/logout', { method: 'POST' });
        }
      } catch (error) {
        console.error('Session sync error:', error);
      } finally {
        setUser(newUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle redirects based on auth state
  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicPage) {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, loading, pathname, isPublicPage, router]);

  // While checking initial auth state, show loading
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingLogo />
      </div>
    );
  }
  
  // If we are on a protected page but not logged in, show a blank state while redirecting
  if (!user && !isPublicPage) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <LoadingLogo />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Profile Context
interface ProfileContextType {
  businessProfile: any | null;
  refreshProfile: () => void;
  loadingProfile: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  businessProfile: null,
  refreshProfile: () => {},
  loadingProfile: true,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businessProfile, setBusinessProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const refreshProfile = useCallback(() => {
    if (user) {
      setLoadingProfile(true);
      getBusinessProfile(user.uid)
        .then(setBusinessProfile)
        .catch(err => console.error("Profile fetch error:", err))
        .finally(() => setLoadingProfile(false));
    } else {
      setBusinessProfile(null);
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [user, refreshProfile]);

  return (
    <ProfileContext.Provider value={{ businessProfile, refreshProfile, loadingProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

// Theme Provider
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}
