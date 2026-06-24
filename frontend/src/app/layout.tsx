import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'DocuSEO – AI-Powered Searchable PDF Platform',
  description:
    'Transform scanned PDFs into searchable, selectable documents. Supports mathematical equations (LaTeX), Chinese, Japanese, Korean, Hindi, and 50+ languages. Free AI-powered OCR.',
  keywords:
    'searchable PDF, selectable PDF, PDF OCR, AI PDF processing, LaTeX math extraction, CJK PDF, make PDF searchable, PDF SEO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
