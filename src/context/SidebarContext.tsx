
import React, { createContext, useContext, useState, useEffect, useRef } from "react";

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
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for 15 seconds
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 15000);
    }

    // Cleanup timeout on unmount or when collapsed
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

    // Only add event listener when sidebar is expanded
    if (!isCollapsed) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCollapsed]);
  
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
