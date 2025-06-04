
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, CompanyAddress } from "@/types/auth";

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  markup_type: 'percentage' | 'fixed';
  markup_value: number;
  address: CompanyAddress;
}

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

export const useCompanyProfile = (companyId?: string) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    phone: '',
    markup_type: 'percentage',
    markup_value: 0,
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    }
  });

  const fetchCompany = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      
      const transformedCompany = transformCompanyData(data);
      setCompany(transformedCompany);
      
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

  const saveCompany = async (isSuperAdmin: boolean) => {
    if (!companyId) return;

    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address as any,
        updated_at: new Date().toISOString()
      };

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
      fetchCompany();
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  return {
    company,
    loading,
    saving,
    formData,
    setFormData,
    saveCompany
  };
};
