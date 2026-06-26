import { FamilyDetail } from '@/widgets/family-detail';

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  return <FamilyDetail familyId={familyId} />;
}
