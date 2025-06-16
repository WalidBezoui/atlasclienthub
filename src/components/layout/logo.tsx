import { Aperture } from 'lucide-react'; // Using Aperture as a placeholder geometric icon
import { APP_NAME } from '@/lib/constants';

export function Logo({ collapsed } : { collapsed?: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-4 ${collapsed ? 'justify-center' : ''}`}>
      <Aperture className="h-8 w-8 text-sidebar-primary" />
      {!collapsed && <h1 className="text-xl font-headline font-bold text-sidebar-foreground whitespace-nowrap">{APP_NAME}</h1>}
    </div>
  );
}
