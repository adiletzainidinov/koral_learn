import type { Metadata } from 'next';
import { AssignmentsList } from '@/widgets/assignments-list';

export const metadata: Metadata = { title: 'Задания' };

export default function AssignmentsPage() {
  return <AssignmentsList />;
}
