
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
        This layout is mobile-first. It defaults to a vertical column (`flex-col`).
        On small screens and up (`sm:`), it switches to a horizontal row (`sm:flex-row`),
        vertically centers items (`sm:items-center`), and pushes them apart (`sm:justify-between`).
        This is a robust pattern for responsive headers.
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Title, Description, and Icon Block */}
        {/* `min-w-0` is crucial for flexbox to allow text content to shrink and wrap. */}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        
        {/* Actions Block */}
        {/* `flex-shrink-0` prevents this container from being squashed by the title block. */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
