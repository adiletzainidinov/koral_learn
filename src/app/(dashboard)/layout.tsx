import { AppSidebar } from '@/widgets/app-sidebar';
import { AppHeader } from '@/widgets/app-header';
import { StoreInitializer } from '@/widgets/store-initializer';
import { Container } from '@/shared/ui/container';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <StoreInitializer />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main id="main-content" className="min-w-0">
          <Container className="py-4 sm:py-6">{children}</Container>
        </main>
      </div>
    </div>
  );
}
