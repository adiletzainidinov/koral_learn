import type { Metadata } from 'next';
import { StudentForm } from '@/features/students/student-form';

export const metadata: Metadata = { title: 'Редактировать ученика' };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentForm mode="edit" studentId={studentId} />;
}
