
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useAuth } from "@/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UsersHeader } from "@/components/users/UsersHeader";
import { UsersSearch } from "@/components/users/UsersSearch";
import { UsersTable } from "@/components/users/UsersTable";
import { useUsers } from "@/hooks/useUsers";

const Users = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { users, loading, error } = useUsers();

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

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TmsLayout>
      <UsersHeader />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Users</CardTitle>
            <UsersSearch 
              searchTerm={searchTerm} 
              onSearchChange={setSearchTerm} 
            />
          </div>
          <CardDescription>
            {loading
              ? "Loading users..."
              : error
                ? error
                : `Showing ${filteredUsers.length} of ${users.length} users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={filteredUsers} loading={loading} />
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Users;
