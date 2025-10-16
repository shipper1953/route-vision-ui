import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface BulkImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export const useShopifyBulkImport = (companyId?: string) => {
  const { toast } = useToast();
  const [progress, setProgress] = useState<BulkImportProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    status: 'idle',
  });
  const [importing, setImporting] = useState(false);

  const triggerImport = async (dateRangeDays: number) => {
    if (!companyId) return;

    setImporting(true);
    setProgress({
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: 'running',
    });

    try {
      const { data, error } = await supabase.functions.invoke('shopify-bulk-import', {
        body: {
          companyId,
          dateRangeDays,
        },
      });

      if (error) throw error;

      setProgress({
        total: data.total || 0,
        processed: data.processed || 0,
        succeeded: data.succeeded || 0,
        failed: data.failed || 0,
        status: 'completed',
      });

      toast({
        title: 'Import Complete',
        description: `Imported ${data.succeeded} orders successfully`,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      setProgress((prev) => ({ ...prev, status: 'failed' }));
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import orders',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setProgress({
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: 'idle',
    });
  };

  return {
    progress,
    importing,
    triggerImport,
    reset,
  };
};
