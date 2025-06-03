
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { UserRoleBadge } from "./UserRoleBadge";
import { UserStatusBadge } from "./UserStatusBadge";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

interface UserTableRowProps {
  user: User;
}

export const UserTableRow = ({ user }: UserTableRowProps) => {
  return (
    <TableRow key={user.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserAvatar name={user.name} />
          <span className="font-medium">{user.name}</span>
        </div>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <UserRoleBadge role={user.role} />
      </TableCell>
      <TableCell>
        <UserStatusBadge status={user.status} />
      </TableCell>
      <TableCell>{user.lastLogin || "Never"}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  );
};
