import { AppSidebar } from '@/widgets/app-sidebar';
import { AppHeader } from '@/widgets/app-header';
import { StoreInitializer } from '@/widgets/store-initializer';
import { Container } from '@/shared/ui/container';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <StoreInitializer />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main>
          <Container className="py-6">{children}</Container>
        </main>
      </div>
    </div>
  );
}
