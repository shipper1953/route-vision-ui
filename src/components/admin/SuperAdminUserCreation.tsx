
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserDialog } from "./dialogs/CreateUserDialog";
import { UsersTable } from "./tables/UsersTable";
import { useUserManagement } from "./hooks/useUserManagement";

export const SuperAdminUserCreation = () => {
  const {
    users,
    companies,
    loading,
    fetchUsers
  } = useUserManagement();

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <CreateUserDialog 
            companies={companies} 
            onUserCreated={fetchUsers} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <UsersTable
          users={users}
          companies={companies}
          onUserUpdated={fetchUsers}
        />
      </CardContent>
    </Card>
  );
};
