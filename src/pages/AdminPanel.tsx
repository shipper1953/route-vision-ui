
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const { isAuthenticated, isSuperAdmin, isCompanyAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (isSuperAdmin) {
        navigate('/super-admin');
      } else if (isCompanyAdmin) {
        navigate('/company-admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, isSuperAdmin, isCompanyAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AdminPanel;
