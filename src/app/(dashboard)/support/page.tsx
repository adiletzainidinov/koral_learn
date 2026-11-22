import { Suspense } from 'react';
import Link from 'next/link';
import { SupportDashboard } from '@/widgets/support-dashboard';

function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-96 bg-slate-100 rounded-2xl" />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="mx-auto max-w-[1440px] px-4 pt-4 md:px-6"><div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-800">Текущий раздел пока использует локальные данные. Для настоящих оплат используйте отдельный защищённый реестр после подключения базы: <Link href="/real-payments" className="font-semibold text-emerald-800 underline">Реальные семьи и платежи</Link>.</div></div>
      <SupportDashboard />
    </Suspense>
  );
}
