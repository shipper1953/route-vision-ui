
import { TmsSidebar } from "./TmsSidebar";
import { TmsHeader } from "./TmsHeader";
import { PageTransition } from "@/components/transitions/PageTransition";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";

interface TmsLayoutProps {
  children: React.ReactNode;
}

export function TmsLayout({ children }: TmsLayoutProps) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="flex min-h-screen bg-background">
      <TmsSidebar />
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300",
        isCollapsed ? "ml-16" : "ml-16 md:ml-64"
      )}>
        <TmsHeader />
        <main className="flex-1 p-6">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
