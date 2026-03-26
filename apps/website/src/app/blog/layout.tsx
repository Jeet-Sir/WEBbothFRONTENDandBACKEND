import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sabapplier Blog - Tips for Grants & Jobs',
  description: 'Guides for students and founders on how to automate applications and secure funding using AI.',
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
