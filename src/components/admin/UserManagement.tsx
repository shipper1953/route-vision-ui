
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteUserDialog } from "./dialogs/InviteUserDialog";
import { CompanyUsersTable } from "./tables/CompanyUsersTable";
import { useCompanyUsers } from "./hooks/useCompanyUsers";

interface UserManagementProps {
  companyId?: string;
}

export const UserManagement = ({ companyId }: UserManagementProps) => {
  const {
    users,
    loading,
    fetchUsers,
    updateUserRole,
    removeUser
  } = useCompanyUsers(companyId);

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Company User Management</CardTitle>
          <InviteUserDialog 
            companyId={companyId} 
            onUserInvited={fetchUsers} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <CompanyUsersTable
          users={users}
          onRoleUpdate={updateUserRole}
          onUserRemove={removeUser}
        />
      </CardContent>
    </Card>
  );
};
