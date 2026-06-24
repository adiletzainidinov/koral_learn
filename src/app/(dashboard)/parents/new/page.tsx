import { ParentForm } from '@/features/parents/parent-form';

interface Props {
  searchParams: Promise<{ familyId?: string }>;
}

export default async function NewParentPage({ searchParams }: Props) {
  const { familyId } = await searchParams;
  return <ParentForm mode="create" initialFamilyId={familyId} />;
}
