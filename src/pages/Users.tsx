
import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Sample data - would be fetched from API in production
const users = [
  { 
    id: "USR-1234", 
    name: "John Smith", 
    email: "john.smith@shiptornado.com", 
    role: "admin", 
    status: "active",
    lastLogin: "May 14, 2025" 
  },
  { 
    id: "USR-1235", 
    name: "Sarah Johnson", 
    email: "sarah.johnson@shiptornado.com", 
    role: "manager", 
    status: "active",
    lastLogin: "May 15, 2025" 
  },
  { 
    id: "USR-1236", 
    name: "Michael Brown", 
    email: "michael.brown@shiptornado.com", 
    role: "staff", 
    status: "active",
    lastLogin: "May 13, 2025" 
  },
  { 
    id: "USR-1237", 
    name: "Emily Davis", 
    email: "emily.davis@shiptornado.com", 
    role: "manager", 
    status: "inactive",
    lastLogin: "April 30, 2025" 
  },
  { 
    id: "USR-1238", 
    name: "Robert Wilson", 
    email: "robert.wilson@shiptornado.com", 
    role: "staff", 
    status: "pending",
    lastLogin: "Never" 
  }
];

const UserStatus = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'success' };
      case 'inactive':
        return { label: 'Inactive', variant: 'outline' };
      case 'pending':
        return { label: 'Pending', variant: 'warning' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

const UserRole = ({ role }: { role: string }) => {
  const getRoleDetails = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', variant: 'default' };
      case 'manager':
        return { label: 'Manager', variant: 'secondary' };
      case 'staff':
        return { label: 'Staff', variant: 'outline' };
      default:
        return { label: role, variant: 'outline' };
    }
  };

  const { label, variant } = getRoleDetails(role);
  return <Badge variant={variant as any}>{label}</Badge>;
};

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Users</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Button 
            className="bg-tms-blue hover:bg-tms-blue-400"
            onClick={() => navigate('/create-user')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
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
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm font-medium">
                        {user.name.split(' ').map(name => name[0]).join('')}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <UserRole role={user.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatus status={user.status} />
                  </TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Users;
