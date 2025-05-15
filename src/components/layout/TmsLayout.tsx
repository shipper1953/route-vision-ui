
import { TmsSidebar } from "./TmsSidebar";
import { TmsHeader } from "./TmsHeader";
import { PageTransition } from "@/components/transitions/PageTransition";
import { cn } from "@/lib/utils";

interface TmsLayoutProps {
  children: React.ReactNode;
}

export function TmsLayout({ children }: TmsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <TmsSidebar />
      <div className="flex flex-col flex-1 ml-16 md:ml-64">
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
