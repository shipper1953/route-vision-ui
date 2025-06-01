
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface LogoutButtonProps {
  isCollapsed: boolean;
}

export const LogoutButton = ({ isCollapsed }: LogoutButtonProps) => {
  const { logout, loading } = useAuth();
  const { setIsCollapsed } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsCollapsed(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login even if logout fails
      navigate('/login');
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
