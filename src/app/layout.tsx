import type { Metadata } from 'next';
import './globals.css';
import { LanguageDocument } from '@/shared/i18n/language-switcher';

export const metadata: Metadata = {
  title: { default: 'QuranLearn', template: '%s — QuranLearn' },
  description: 'Система управления учениками и заданиями',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body><LanguageDocument />{children}</body>
    </html>
  );
}
