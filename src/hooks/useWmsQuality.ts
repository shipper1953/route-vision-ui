import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useWmsQuality = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const fetchQcInspections = async (status?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qc_inspections' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching QC inspections:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createQcInspection = async (params: {
    receivingLineId?: string;
    itemId: string;
    templateId?: string;
    quantityInspected: number;
  }) => {
    try {
      setLoading(true);

      const inspectionNumber = `QC-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('qc_inspections' as any)
        .insert({
          inspection_number: inspectionNumber,
          receiving_line_id: params.receivingLineId,
          item_id: params.itemId,
          template_id: params.templateId,
          company_id: userProfile?.company_id,
          inspector_id: userProfile?.id,
          status: 'in_progress',
          quantity_inspected: params.quantityInspected,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('QC inspection started');
      return data;
    } catch (error) {
      console.error('Error creating QC inspection:', error);
      toast.error('Failed to create QC inspection');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const completeQcInspection = async (params: {
    inspectionId: string;
    results: any;
    quantityPassed: number;
    quantityFailed: number;
    failureReasons?: string[];
    disposition: 'accept' | 'reject' | 'return_to_vendor' | 'rework';
  }) => {
    try {
      setLoading(true);

      const status = params.quantityFailed === 0 ? 'passed' : 'failed';

      const { error } = await supabase
        .from('qc_inspections' as any)
        .update({
          status,
          results: params.results,
          quantity_passed: params.quantityPassed,
          quantity_failed: params.quantityFailed,
          failure_reasons: params.failureReasons,
          disposition: params.disposition,
          completed_at: new Date().toISOString()
        })
        .eq('id', params.inspectionId);

      if (error) throw error;

      toast.success(`QC inspection ${status}`);
      return true;
    } catch (error) {
      console.error('Error completing QC inspection:', error);
      toast.error('Failed to complete QC inspection');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchQcTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qc_templates' as any)
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching QC templates:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchQcInspections,
    createQcInspection,
    completeQcInspection,
    fetchQcTemplates
  };
};
