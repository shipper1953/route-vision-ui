import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  // Auto-collapse after 15 seconds
  useEffect(() => {
    if (!isCollapsed) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 15000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isCollapsed]);

  // Handle outside clicks
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
          className="w-full bg-tms-navy hover:bg-tms-navy/90"
          variant="outline"
        >
          Logout
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