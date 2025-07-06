
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
        This layout uses CSS Grid for a more robust responsive behavior.
        It defaults to a single column (mobile), ensuring no overflow.
        On medium screens and up (`md:`), it switches to a two-column grid.
        The first column (`md:grid-cols-[1fr_auto]`) is flexible, and the second column sizes to its content.
        This definitively solves the layout issue.
      */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] md:items-center gap-4">
        
        {/* Title, Description, and Icon Block */}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />}
          <div className="min-w-0"> {/* min-w-0 is still crucial for flex items to allow text wrapping */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        
        {/* Actions Block */}
        {/* On mobile, this will stack below. On desktop, it goes into the second grid column and aligns to the end. */}
        {actions && (
          <div className="md:justify-self-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
