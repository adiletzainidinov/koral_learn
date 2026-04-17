import type { Metadata } from 'next';
import { StudentsTable } from '@/widgets/students-table';

export const metadata: Metadata = { title: 'Ученики' };

export default function StudentsPage() {
  return <StudentsTable />;
}
