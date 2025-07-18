import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/auth';

export const useCompanyInfo = (companyId?: string) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) {
          console.error('Error fetching company:', error);
          return;
        }

        setCompany({
          ...data,
          address: data.address as unknown as Company['address'],
          markup_type: data.markup_type as Company['markup_type']
        });
      } catch (error) {
        console.error('Error in fetchCompany:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  return { company, loading };
};