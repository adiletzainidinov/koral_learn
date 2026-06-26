import { redirect } from 'next/navigation';

export default function ParentsPage() {
  redirect('/families?tab=representatives');
}
