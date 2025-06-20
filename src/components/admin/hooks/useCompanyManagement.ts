
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
    address: dbCompany.address ? (dbCompany.address as unknown as Company['address']) : undefined,
    settings: dbCompany.settings,
    created_at: dbCompany.created_at,
    updated_at: dbCompany.updated_at,
    is_active: dbCompany.is_active,
    markup_type: (dbCompany.markup_type as 'percentage' | 'fixed') || 'percentage',
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
      
      // Check current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id, 'Session error:', sessionError);
      
      // Try to fetch companies with explicit admin bypass
      const { data, error, count } = await supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Companies fetch result:', { data, error, count });
      console.log('Query executed, total count:', count);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      // Add more detailed logging
      console.log('Raw company data from database:', data);
      console.log('Number of companies returned:', data?.length || 0);
      
      const transformedCompanies = (data || []).map(transformCompanyData);
      console.log('Transformed companies:', transformedCompanies);
      
      setCompanies(transformedCompanies);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      toast.error(`Failed to fetch companies: ${error?.message || 'Unknown error'}`);
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
