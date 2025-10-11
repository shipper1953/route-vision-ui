
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import { CreateUserHeader } from "@/components/users/CreateUserHeader";
import { CreateUserForm } from "@/components/users/CreateUserForm";

const CreateUser = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  
  // Show loading state while checking auth
  if (authLoading) {
    return (
      <TmsLayout>
        <div className="flex items-center justify-center min-h-64">
          <div>Loading...</div>
        </div>
      </TmsLayout>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <TmsLayout>
      <CreateUserHeader />
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-tms-blue" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>
            Enter the details for the new user. They will receive an email invitation to join the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default CreateUser;
