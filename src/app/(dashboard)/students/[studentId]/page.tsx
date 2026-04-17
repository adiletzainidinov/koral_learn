import type { Metadata } from 'next';
import { StudentProfile } from '@/widgets/student-profile';

export const metadata: Metadata = { title: 'Профиль ученика' };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentProfile studentId={studentId} />;
}
