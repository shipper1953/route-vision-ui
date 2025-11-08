
import { TmsSidebar } from "./TmsSidebar";
import { TmsHeader } from "./TmsHeader";
import { PageTransition } from "@/components/transitions/PageTransition";
import { LoadingPage } from "@/components/transitions/LoadingPage";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface TmsLayoutProps {
  children: React.ReactNode;
}

export function TmsLayout({ children }: TmsLayoutProps) {
  const { isCollapsed } = useSidebar();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return <LoadingPage />;
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
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
