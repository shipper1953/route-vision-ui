
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LogoutButtonProps {
  isCollapsed: boolean;
}

export const LogoutButton = ({ isCollapsed }: LogoutButtonProps) => {
  const { logout, loading, clearAuthState } = useAuth();
  const { setIsCollapsed } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsCollapsed(true);
    
    try {
      console.log('Starting logout process...');
      
      // Clear auth state immediately
      clearAuthState();
      
      // Perform logout
      await logout();
      
      // Force navigation to login
      navigate('/login', { replace: true });
      
      // Clear any remaining storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('Successfully logged out');
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Still clear state and redirect even if logout fails
      clearAuthState();
      navigate('/login', { replace: true });
      
      toast.warning('Logout completed (with some issues)');
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full",
        isCollapsed ? "justify-center" : "",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <LogOut size={20} />
      {!isCollapsed && <span>Logout</span>}
    </button>
  );
};
