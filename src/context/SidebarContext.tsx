
import React, { createContext, useContext, useState, useEffect, useRef } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < 1024;
  });
  const [hasDesktopPreference, setHasDesktopPreference] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setHasDesktopPreference(true);
    }
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

  // Automatically adapt the sidebar state when resizing between mobile and desktop breakpoints
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;

      const isDesktop = window.innerWidth >= 1024;

      if (!isDesktop) {
        setHasDesktopPreference(false);
        setIsCollapsed(true);
        return;
      }

      if (!hasDesktopPreference) {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [hasDesktopPreference]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleSidebar, sidebarRef }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
