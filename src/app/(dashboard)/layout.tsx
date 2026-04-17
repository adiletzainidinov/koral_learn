import { AppSidebar } from '@/widgets/app-sidebar';
import { AppHeader } from '@/widgets/app-header';
import { StoreInitializer } from '@/widgets/store-initializer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <StoreInitializer />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
