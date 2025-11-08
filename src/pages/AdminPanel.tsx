
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "@/components/transitions/LoadingPage";
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
    return <LoadingPage />;
  }

  return null;
};

export default AdminPanel;
