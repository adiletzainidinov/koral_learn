import type { Metadata } from 'next';
import { StudentForm } from '@/features/students/student-form';

export const metadata: Metadata = { title: 'Новый ученик' };

export default function NewStudentPage() {
  return <StudentForm />;
}
