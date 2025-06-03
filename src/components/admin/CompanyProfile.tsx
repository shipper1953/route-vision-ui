import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, CompanyAddress } from "@/types/auth";

interface CompanyProfileProps {
  companyId?: string;
}

export const CompanyProfile = ({ companyId }: CompanyProfileProps) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
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
      
      setCompany(data);
      
      // Safely handle the address field from database
      const addressData = data.address as CompanyAddress | null;
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
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
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
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
