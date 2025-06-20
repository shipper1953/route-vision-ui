
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company } from "@/types/auth";

// Transform database company data to our Company type
const transformCompanyData = (dbCompany: any): Company => {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    phone: dbCompany.phone,
    address: dbCompany.address,
    settings: dbCompany.settings,
    created_at: dbCompany.created_at,
    updated_at: dbCompany.updated_at,
    is_active: dbCompany.is_active,
    markup_type: dbCompany.markup_type || 'percentage',
    markup_value: dbCompany.markup_value || 0
  };
};

export const useCompanyManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    setCompanies,
    fetchCompanies,
    toggleCompanyStatus
  };
};
