
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company } from "@/types/auth";
import { Plus } from "lucide-react";

interface CreateCompanyDialogProps {
  onCompanyCreated: (company: Company) => void;
}

export const CreateCompanyDialog = ({ onCompanyCreated }: CreateCompanyDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    markup_type: 'percentage' as 'percentage' | 'fixed',
    markup_value: 0
  });

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
      
      const transformedCompany: Company = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address ? (data.address as unknown as Company['address']) : undefined,
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_active: data.is_active,
        markup_type: (data.markup_type as 'percentage' | 'fixed') || 'percentage',
        markup_value: data.markup_value || 0
      };
      
      onCompanyCreated(transformedCompany);
      setNewCompany({ name: '', email: '', phone: '', markup_type: 'percentage', markup_value: 0 });
      setIsOpen(false);
      toast.success('Company created successfully');
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
  );
};
