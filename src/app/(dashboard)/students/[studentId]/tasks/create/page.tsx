import type { Metadata } from 'next';
import { CreateAssignmentPage } from '@/features/assignments/create-assignment-page';

export const metadata: Metadata = { title: 'Создать задание' };

export default async function CreateAssignmentRoute({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <CreateAssignmentPage studentId={studentId} />;
}
