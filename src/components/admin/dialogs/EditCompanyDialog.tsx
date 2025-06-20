
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company } from "@/types/auth";

interface EditCompanyDialogProps {
  company: Company | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyUpdated: (company: Company) => void;
}

export const EditCompanyDialog = ({ company, isOpen, onOpenChange, onCompanyUpdated }: EditCompanyDialogProps) => {
  const [editingCompany, setEditingCompany] = useState<Company | null>(company);

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

      onCompanyUpdated(editingCompany);
      onOpenChange(false);
      setEditingCompany(null);
      toast.success('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
    }
  };

  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
  );
};
