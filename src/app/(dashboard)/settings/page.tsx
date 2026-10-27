import type { Metadata } from 'next';
import { SettingsContent } from '@/widgets/settings-page';

export const metadata: Metadata = { title: 'Настройки' };

export default function SettingsPage() {
  return <SettingsContent />;
}
