
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";

export function TmsHeader() {
  const location = useLocation();
  
  const pageName = useMemo(() => {
    const path = location.pathname;
    
    if (path === "/") return "Dashboard";
    
    // Convert path to title case (e.g., "/create-shipment" -> "Create Shipment")
    const name = path.substring(1).replace(/-/g, " ");
    return name.split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [location]);

  return (
    <header className="h-16 border-b border-border flex items-center px-4 bg-white">
      <div className="flex-1 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-tms-blue hidden md:block">{pageName}</h1>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search..." 
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1" 
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 bg-tms-amber rounded-full"></span>
        </Button>
        <div className="h-9 w-px bg-border mx-2"></div>
        <div className="text-sm">
          <div className="font-medium">Welcome back</div>
          <div className="text-muted-foreground text-xs">Thursday, May 15</div>
        </div>
      </div>
    </header>
  );
}
