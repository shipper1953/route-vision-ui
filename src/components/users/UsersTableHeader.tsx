
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const UsersTableHeader = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Last Login</TableHead>
        <TableHead></TableHead>
      </TableRow>
    </TableHeader>
  );
};
