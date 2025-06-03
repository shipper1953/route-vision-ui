
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { UsersTableHeader } from "./UsersTableHeader";
import { UserTableRow } from "./UserTableRow";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

interface UsersTableProps {
  users: User[];
  loading: boolean;
}

export const UsersTable = ({ users, loading }: UsersTableProps) => {
  return (
    <Table>
      <UsersTableHeader />
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              Loading...
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              No users found.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <UserTableRow key={user.id} user={user} />
          ))
        )}
      </TableBody>
    </Table>
  );
};
