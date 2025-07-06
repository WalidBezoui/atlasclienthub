
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
      {/* 
        This layout uses a simple flexbox approach.
        It defaults to a single column (flex-col) for mobile to guarantee no overflow.
        On sm screens and up, it switches to a row with space-between.
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Title, Description, and Icon Block */}
        <div className="flex items-start gap-3 min-w-0">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0 mt-1 sm:mt-0" />}
          <div className="min-w-0"> {/* min-w-0 is crucial to allow text wrapping */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        
        {/* Actions Block */}
        {actions && (
          <div className="shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
