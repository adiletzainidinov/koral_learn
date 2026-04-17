import type { Metadata } from 'next';
import { AttendanceTable } from '@/widgets/attendance-table';

export const metadata: Metadata = { title: 'Посещаемость' };

export default function AttendancePage() {
  return <AttendanceTable />;
}
