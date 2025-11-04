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

      // Check if this is a thermal printer (Zebra, ZPL-based)
      const selectedPrinterInfo = printers.find(p => p.id === selectedPrinter);
      const isThermalPrinter = selectedPrinterInfo?.name?.toLowerCase().includes('zebra') || 
                               selectedPrinterInfo?.name?.toLowerCase().includes('zpl') ||
                               selectedPrinterInfo?.name?.toLowerCase().includes('zt');

      // Try to extract shipment ID from title (e.g., "Shipping Label 425")
      const shipmentIdMatch = title.match(/\d+/);
      
      if (isThermalPrinter && shipmentIdMatch) {
        const shipmentId = parseInt(shipmentIdMatch[0]);
        console.log(`PrintNode - Thermal printer detected, checking for ZPL data for shipment ${shipmentId}`);
        
        // Query for ZPL label data
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .select('label_zpl, zpl_label')
          .eq('id', shipmentId)
          .single();

      if (!shipmentError && shipmentData && (shipmentData.label_zpl || shipmentData.zpl_label)) {
          const zplCode = shipmentData.label_zpl || shipmentData.zpl_label;
          console.log('PrintNode - Found ZPL data, printing with ZPL for thermal printer');
          return await printZPL(zplCode, title);
        }
        
        // No ZPL available - fall through to PDF/PNG printing via emulation
        console.log('PrintNode - No ZPL data, using PDF/PNG via printer emulation');
      }

      // Use pdf_uri for non-thermal or PDF files
      const contentType = 'pdf_uri';
      console.log(`PrintNode - Using ${contentType} for label (thermal: ${isThermalPrinter})`);

      const { data, error } = await supabase.functions.invoke('printnode-print', {
        body: {
          action: 'print-uri',
          printerId: selectedPrinter,
          title,
          contentType,
          content: pdfUrl,
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
