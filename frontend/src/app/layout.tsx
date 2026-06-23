import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuSEO - Make Your PDFs 100% Searchable',
  description: 'Boost your SEO by making your PDF documents completely indexable by Google. Our smart AI extracts text perfectly and embeds it without duplicating existing content.',
  keywords: 'PDF, SEO, searchable PDF, OCR, text extraction, Google indexing, optimize PDF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
