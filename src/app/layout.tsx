
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from '@/components/app-layout';
import { AuthProvider, ProfileProvider, ThemeProvider } from '@/components/auth-provider';
import { ChunkLoadErrorBoundary } from '@/components/chunk-load-error-boundary';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  applicationName: 'Sprout Track',
  title: {
    default: 'Sprout Track',
    template: '%s | Sprout Track',
  },
  description: 'Manage your business growth with ease.',
  manifest: '/manifest.webmanifest?v=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sprout Track',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: '/favicon.svg',
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f7f6' },
    { media: '(prefers-color-scheme: dark)', color: '#121c2a' },
  ],
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
         <meta name="theme-color" content="#253953" />
      </head>
      <body className={`${inter.variable} font-sans antialiased max-w-full overflow-x-hidden`}>
        <ChunkLoadErrorBoundary>
          <ThemeProvider>
              <AuthProvider>
                <ProfileProvider>
                  <FirebaseErrorListener />
                  <AppLayout>
                    {children}
                  </AppLayout>
                </ProfileProvider>
              </AuthProvider>
          </ThemeProvider>
        </ChunkLoadErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
