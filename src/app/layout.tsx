import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coffee Trailer Admin',
  description: 'Admin for menu & settings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // <html> and <body> render for every page.
  return (
    <html lang="en">
      {/* Tailwind utility classes to give a gentle base style */}
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
