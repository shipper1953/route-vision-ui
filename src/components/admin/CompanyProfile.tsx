import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, CompanyAddress } from "@/types/auth";
import { useAuth } from "@/context";

interface CompanyProfileProps {
  companyId?: string;
}

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

export const CompanyProfile = ({ companyId }: CompanyProfileProps) => {
  const { isSuperAdmin } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    markup_type: 'percentage' as 'percentage' | 'fixed',
    markup_value: 0,
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    } as CompanyAddress
  });

  useEffect(() => {
    if (companyId) {
      fetchCompany();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      
      // Transform the database data to match our Company type
      const transformedCompany = transformCompanyData(data);
      setCompany(transformedCompany);
      
      // Safely handle the address field from database
      const addressData = transformedCompany.address;
      setFormData({
        name: transformedCompany.name || '',
        email: transformedCompany.email || '',
        phone: transformedCompany.phone || '',
        markup_type: transformedCompany.markup_type || 'percentage',
        markup_value: transformedCompany.markup_value || 0,
        address: addressData || {
          street1: '',
          street2: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        }
      });
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      // Only include markup fields in update if user is super admin
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address as any,
        updated_at: new Date().toISOString()
      };

      // Only super admins can update markup settings
      if (isSuperAdmin) {
        updateData.markup_type = formData.markup_type;
        updateData.markup_value = formData.markup_value;
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) throw error;
      
      toast.success('Company profile updated successfully');
      fetchCompany(); // Refresh data
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading company profile...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only show markup settings to super admins */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Rate Markup Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="markup_type">Markup Type</Label>
                <Select 
                  value={formData.markup_type} 
                  onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, markup_type: value })}
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
                  Markup Value {formData.markup_type === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="markup_value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.markup_type === 'percentage' ? "100" : undefined}
                  value={formData.markup_value}
                  onChange={(e) => setFormData({ ...formData, markup_value: parseFloat(e.target.value) || 0 })}
                  placeholder={formData.markup_type === 'percentage' ? "Enter percentage (0-100)" : "Enter fixed amount"}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {formData.markup_type === 'percentage' 
                ? `A ${formData.markup_value}% markup will be applied to all shipping rates.`
                : `A $${formData.markup_value.toFixed(2)} markup will be added to all shipping rates.`
              }
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street1">Street Address</Label>
            <Input
              id="street1"
              value={formData.address.street1}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, street1: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="street2">Street Address 2 (Optional)</Label>
            <Input
              id="street2"
              value={formData.address.street2}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, street2: e.target.value }
              })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, city: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, state: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.address.zip}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, zip: e.target.value }
                })}
              />
            </div>
          </div>
          
          <Button onClick={saveCompany} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
