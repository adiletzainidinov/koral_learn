import type { Metadata } from 'next';
import { LeaderboardTable } from '@/widgets/leaderboard-table';

export const metadata: Metadata = { title: 'Рейтинг' };

export default function LeaderboardPage() {
  return <LeaderboardTable />;
}
