import { cn } from '../lib/cn';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('w-full max-w-[1440px] mx-auto px-6 xl:px-8', className)}>
      {children}
    </div>
  );
}
