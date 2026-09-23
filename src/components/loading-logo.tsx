
import { cn } from '@/lib/utils';
import { Sprout } from 'lucide-react';

export default function LoadingLogo() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={cn(
        "rounded-lg bg-primary p-2 text-primary-foreground animate-pulse-icon"
      )}>
        <Sprout className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground animate-fade-in-text">
        Sprout Track
      </h1>
    </div>
  );
}
