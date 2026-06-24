import { Suspense } from 'react';
import { SupportDashboard } from '@/widgets/support-dashboard';

function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">
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
      <SupportDashboard />
    </Suspense>
  );
}
