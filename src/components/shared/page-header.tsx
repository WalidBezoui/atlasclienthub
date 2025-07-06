
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 pb-4 border-b border-border">
      {/* 
        This component uses a simple grid layout.
        - On mobile (default): It's a single column grid, so items stack vertically.
        - On medium screens and up (md:): It switches to a two-column grid.
        This approach is robust and avoids flexbox wrapping issues that caused overflow.
      */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-4">
        
        {/* Title, Description, and Icon Block */}
        <div className="flex items-start gap-3 min-w-0">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        
        {/* Actions Block */}
        {actions && (
          <div className="md:justify-self-end w-full md:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
