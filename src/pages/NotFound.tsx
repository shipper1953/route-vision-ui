
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TmsLayout } from "@/components/layout/TmsLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <TmsLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <h1 className="text-6xl font-bold text-tms-blue mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">The page you're looking for doesn't exist</p>
        <Button asChild>
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </div>
    </TmsLayout>
  );
};

export default NotFound;
