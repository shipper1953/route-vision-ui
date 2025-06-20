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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, CompanyAddress } from "@/types/auth";
import { Plus, Edit, Trash2, Users, Wallet } from "lucide-react";
import { CompanyWalletDialog } from "./dialogs/CompanyWalletDialog";

// Transform database company data to our Company type
const transformCompanyData = (dbCompany: any): Company => {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    phone: dbCompany.phone,
    address: dbCompany.address as CompanyAddress | undefined,
    settings: dbCompany.settings,
    created_at: dbCompany.created_at,
    updated_at: dbCompany.updated_at,
    is_active: dbCompany.is_active,
    markup_type: dbCompany.markup_type || 'percentage',
    markup_value: dbCompany.markup_value || 0
  };
};

export const CompanyManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    markup_type: 'percentage' as 'percentage' | 'fixed',
    markup_value: 0
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Companies fetch result:', { data, error });

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      // Transform the database data to match our Company type
      const transformedCompanies = (data || []).map(transformCompanyData);
      console.log('Transformed companies:', transformedCompanies);
      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    try {
      console.log('Creating company:', newCompany);
      
      const { data, error } = await supabase
        .from('companies')
        .insert([newCompany])
        .select()
        .single();

      if (error) {
        console.error('Error creating company:', error);
        throw error;
      }

      console.log('Company created:', data);
      
      // Transform the new company data and add to state
      const transformedCompany = transformCompanyData(data);
      setCompanies([transformedCompany, ...companies]);
      setNewCompany({ name: '', email: '', phone: '', markup_type: 'percentage', markup_value: 0 });
      setIsCreateDialogOpen(false);
      toast.success('Company created successfully');
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
    }
  };

  const updateCompany = async () => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: editingCompany.name,
          email: editingCompany.email,
          phone: editingCompany.phone,
          markup_type: editingCompany.markup_type,
          markup_value: editingCompany.markup_value,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      setCompanies(companies.map(company => 
        company.id === editingCompany.id ? editingCompany : company
      ));
      setIsEditDialogOpen(false);
      setEditingCompany(null);
      toast.success('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
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

  const handleEditClick = (company: Company) => {
    setEditingCompany({ ...company });
    setIsEditDialogOpen(true);
  };

  const handleWalletClick = (company: Company) => {
    setSelectedCompany(company);
    setIsWalletDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mr-4"></div>
            <p>Loading companies...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {companies.length} companies found
            </p>
          </div>
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
                <div>
                  <Label htmlFor="markup_type">Markup Type</Label>
                  <Select 
                    value={newCompany.markup_type} 
                    onValueChange={(value: 'percentage' | 'fixed') => setNewCompany({ ...newCompany, markup_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select markup type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="markup_value">
                    Markup Value {newCompany.markup_type === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="markup_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCompany.markup_value}
                    onChange={(e) => setNewCompany({ ...newCompany, markup_value: parseFloat(e.target.value) || 0 })}
                    placeholder={newCompany.markup_type === 'percentage' ? "Enter percentage" : "Enter fixed amount"}
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
        {companies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No companies found. Create your first company to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Markup Type</TableHead>
                <TableHead>Markup Value</TableHead>
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
                    <Badge variant="outline">
                      {company.markup_type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {company.markup_type === 'percentage' 
                      ? `${company.markup_value || 0}%` 
                      : `$${(company.markup_value || 0).toFixed(2)}`
                    }
                  </TableCell>
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleWalletClick(company)}
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditClick(company)}
                      >
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
        )}

        {/* Edit Company Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            {editingCompany && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Company Name</Label>
                  <Input
                    id="edit-name"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingCompany.email || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    placeholder="Enter company email"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingCompany.phone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-markup_type">Markup Type</Label>
                  <Select 
                    value={editingCompany.markup_type || 'percentage'} 
                    onValueChange={(value: 'percentage' | 'fixed') => setEditingCompany({ ...editingCompany, markup_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select markup type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-markup_value">
                    Markup Value {editingCompany.markup_type === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="edit-markup_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingCompany.markup_value || 0}
                    onChange={(e) => setEditingCompany({ ...editingCompany, markup_value: parseFloat(e.target.value) || 0 })}
                    placeholder={editingCompany.markup_type === 'percentage' ? "Enter percentage" : "Enter fixed amount"}
                  />
                </div>
                <Button onClick={updateCompany} className="w-full">
                  Update Company
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Company Wallet Dialog */}
        <CompanyWalletDialog
          open={isWalletDialogOpen}
          onOpenChange={setIsWalletDialogOpen}
          company={selectedCompany}
        />
      </CardContent>
    </Card>
  );
};
