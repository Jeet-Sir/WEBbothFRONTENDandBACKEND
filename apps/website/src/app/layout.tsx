import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  // This changes the main Blue Title
  title: {
    template: '%s | Sabapplier AI',
    default: 'Sabapplier AI - Your Trusted Form Filler Agent', 
  },
  // This changes the description text below the title
  description: 'Streamline your applications with Sabapplier. Use the website to manage documents and the extension to auto-fill forms for grants, jobs, internships, and college exams.',
  
  // This fixes the Logo
  icons: {
    icon: '/logo.jpeg', 
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  
  // improved SEO keywords for your target audience
  keywords: ['form filler', 'AI agent', 'grant applications', 'job automation', 'college admission', 'auto-fill extension'],
  // canonical domain to avoid www/non-www confusion
  alternates: {
    canonical: 'https://sabapplier.com/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
