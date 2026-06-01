import { ParentForm } from '@/features/parents/parent-form';

interface Props {
  params: Promise<{ parentId: string }>;
}

export default async function EditParentPage({ params }: Props) {
  const { parentId } = await params;
  return <ParentForm mode="edit" parentId={parentId} />;
}
