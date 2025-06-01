
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  // Handle outside clicks to collapse sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !isCollapsed
      ) {
        setIsCollapsed(true);
      }
    };

    if (!isCollapsed) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCollapsed]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleSidebar, sidebarRef }}>
      <SidebarWithLogout sidebarRef={sidebarRef}>
        {children}
      </SidebarWithLogout>
    </SidebarContext.Provider>
  );
}

// SidebarWithLogout wraps children and renders the logout button at the bottom of the sidebar
function SidebarWithLogout({
  children,
  sidebarRef,
}: {
  children: React.ReactNode;
  sidebarRef: React.RefObject<HTMLDivElement>;
}) {
  const { logout, loading } = useAuth();

  return (
    <div ref={sidebarRef} className="flex flex-col h-full">
      <div className="flex-1">{children}</div>
      <div className="p-4 border-t mt-auto">
        <Button
          onClick={logout}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          variant="destructive"
        >
          <LogOut size={16} />
          {!loading && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
