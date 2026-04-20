import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'QuranLearn', template: '%s — QuranLearn' },
  description: 'Система управления учениками и заданиями',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
