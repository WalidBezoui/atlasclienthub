
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 pb-4 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        
        {actions && (
          <div className="w-full sm:w-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
