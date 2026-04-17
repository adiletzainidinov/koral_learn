import type { Metadata } from 'next';
import { DashboardStats } from '@/widgets/dashboard-stats';
import { TopStudents } from '@/widgets/top-students';
import { RecentActivity } from '@/widgets/recent-activity';

export const metadata: Metadata = { title: 'Дашборд' };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardStats />
      <div className="grid grid-cols-2 gap-6">
        <TopStudents />
        <RecentActivity />
      </div>
    </div>
  );
}
