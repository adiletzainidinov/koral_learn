import { TeamDetail } from '@/widgets/team-detail';

export default function TeamDetailPage({ params }: { params: { teamId: string } }) {
  return <TeamDetail teamId={params.teamId} />;
}
