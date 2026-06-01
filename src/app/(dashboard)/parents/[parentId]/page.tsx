import { ParentDetail } from '@/widgets/parent-detail';

interface Props {
  params: Promise<{ parentId: string }>;
}

export default async function ParentPage({ params }: Props) {
  const { parentId } = await params;
  return <ParentDetail parentId={parentId} />;
}
