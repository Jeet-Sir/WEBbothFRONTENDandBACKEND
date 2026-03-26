import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your SabApplier AI account to access your document vault and application tools.',
  robots: {
    index: false, // Don't index the signin page to avoid clutter
    follow: false,
  },
};

export default function SigninLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
