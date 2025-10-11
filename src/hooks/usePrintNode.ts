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
        body: {},
        method: 'GET',
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

      // Fetch the PDF and convert to base64
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      // Remove data URL prefix if present
      const content = base64.split(',')[1] || base64;

      const { data, error } = await supabase.functions.invoke('printnode-print?action=print', {
        body: {
          printerId: selectedPrinter,
          title,
          contentType: 'pdf_base64',
          content,
          source: 'ShipTornado',
        },
      });

      if (error) throw error;

      toast.success('Print job sent successfully');
      return true;
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to print PDF');
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

      const { data, error } = await supabase.functions.invoke('printnode-print?action=print-zpl', {
        body: {
          printerId: selectedPrinter,
          title,
          zplCode,
        },
      });

      if (error) throw error;

      toast.success('ZPL label sent to printer');
      return true;
    } catch (error) {
      console.error('Error printing ZPL:', error);
      toast.error('Failed to print ZPL label');
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
