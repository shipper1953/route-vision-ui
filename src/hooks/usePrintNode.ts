import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PrintNodePrinter {
  id: number;
  name: string;
  description: string;
  default: boolean;
  state: string;
}

const STORAGE_KEY = 'printnode_selected_printer_id';

export const usePrintNode = () => {
  const [printers, setPrinters] = useState<PrintNodePrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrinters();
    // Load saved printer from localStorage
    const savedPrinterId = localStorage.getItem(STORAGE_KEY);
    if (savedPrinterId) {
      setSelectedPrinter(parseInt(savedPrinterId));
    }
  }, []);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('printnode-print', {
        body: { action: 'list-printers' }
      });

      if (error) throw error;

      if (data?.printers) {
        setPrinters(data.printers);
        // Auto-select saved printer or default printer
        const savedPrinterId = localStorage.getItem(STORAGE_KEY);
        if (savedPrinterId) {
          const savedPrinter = data.printers.find((p: PrintNodePrinter) => p.id === parseInt(savedPrinterId));
          if (savedPrinter) {
            setSelectedPrinter(savedPrinter.id);
          }
        } else {
          const defaultPrinter = data.printers.find((p: PrintNodePrinter) => p.default);
          if (defaultPrinter) {
            setSelectedPrinter(defaultPrinter.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      toast.error('Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  const printPDF = async (pdfUrl: string, title: string = 'Print Job') => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return false;
    }

    try {
      setLoading(true);

      // Fetch the label and convert to base64
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      // Remove data URL prefix if present
      const content = base64.split(',')[1] || base64;

      // PrintNode only supports pdf_base64, pdf_uri, raw_base64, raw_uri
      // Use pdf_base64 for both PDF and PNG files
      const contentType = 'pdf_base64';

      console.log('PrintNode contentType:', contentType, 'blob type:', blob.type);

      const { data, error } = await supabase.functions.invoke('printnode-print', {
        body: {
          action: 'print',
          printerId: selectedPrinter,
          title,
          contentType,
          content,
          source: 'ShipTornado',
        },
      });

      if (error) {
        const errorMsg = error.message || 'Unknown error';
        console.error('Edge function error:', error);
        toast.error(`Print failed: ${errorMsg}`);
        throw error;
      }

      if (data?.error) {
        console.error('PrintNode API error:', data);
        const details = data.details ? `\n${data.details}` : '';
        toast.error(`PrintNode error: ${data.error}${details}`);
        return false;
      }

      if (data?.success) {
        toast.success(`Print job sent successfully (ID: ${data.jobId})`);
        return true;
      } else {
        console.error('PrintNode unexpected response:', data);
        toast.error('Print job failed - unexpected response');
        return false;
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to print PDF';
      toast.error(`Print error: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const printZPL = async (zplCode: string, title: string = 'ZPL Label') => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return false;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('printnode-print', {
        body: {
          action: 'print-zpl',
          printerId: selectedPrinter,
          title,
          zplCode,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`ZPL label sent successfully (ID: ${data.jobId})`);
        return true;
      } else {
        console.error('PrintNode ZPL error:', data);
        toast.error(data?.message || 'ZPL print job failed');
        return false;
      }
    } catch (error) {
      console.error('Error printing ZPL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to print ZPL label';
      toast.error(`ZPL print error: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveSelectedPrinter = (printerId: number) => {
    setSelectedPrinter(printerId);
    localStorage.setItem(STORAGE_KEY, printerId.toString());
    toast.success('Default printer updated');
  };

  return {
    printers,
    selectedPrinter,
    setSelectedPrinter: saveSelectedPrinter,
    loading,
    loadPrinters,
    printPDF,
    printZPL,
  };
};
