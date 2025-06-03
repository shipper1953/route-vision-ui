
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company } from "@/types/auth";
import { Plus, Edit, Trash2, Users, Wallet } from "lucide-react";

export const CompanyManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([newCompany])
        .select()
        .single();

      if (error) throw error;

      setCompanies([data, ...companies]);
      setNewCompany({ name: '', email: '', phone: '' });
      setIsCreateDialogOpen(false);
      toast.success('Company created successfully');
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
    }
  };

  const toggleCompanyStatus = async (companyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !isActive })
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(companies.map(company => 
        company.id === companyId 
          ? { ...company, is_active: !isActive }
          : company
      ));

      toast.success(`Company ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating company status:', error);
      toast.error('Failed to update company status');
    }
  };

  if (loading) {
    return <div>Loading companies...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Company Management</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                    placeholder="Enter company email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <Button onClick={createCompany} className="w-full">
                  Create Company
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.email || 'N/A'}</TableCell>
                <TableCell>{company.phone || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={company.is_active ? 'default' : 'secondary'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(company.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Wallet className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={company.is_active ? "destructive" : "default"}
                      onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                    >
                      {company.is_active ? <Trash2 className="h-4 w-4" /> : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
