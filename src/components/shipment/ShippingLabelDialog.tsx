
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, PackageCheck, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePrintNode } from "@/hooks/usePrintNode";

interface OrderDetails {
  carrier: string;
  service: string;
  trackingCode: string;
  trackingUrl: string;
  createdAt: string;
}

interface ShippingLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelUrl: string | undefined;
  shipmentId: string;
  orderDetails?: OrderDetails;
  title?: string;
}

export const ShippingLabelDialog = ({
  isOpen,
  onClose,
  labelUrl,
  shipmentId,
  orderDetails,
  title
}: ShippingLabelDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [zplContent, setZplContent] = useState<string | null>(null);
  const navigate = useNavigate();
  const { printers, selectedPrinter, setSelectedPrinter, loading: printLoading, printPDF, printZPL } = usePrintNode();
  
  // Detect if selected printer is a ZPL/thermal printer
  const selectedPrinterInfo = printers.find(p => p.id === selectedPrinter);
  const isZplPrinter = selectedPrinterInfo?.name.toLowerCase().includes('zpl') || 
                       selectedPrinterInfo?.name.toLowerCase().includes('zebra') ||
                       selectedPrinterInfo?.name.toLowerCase().includes('zdesigner');
  
  // Fetch ZPL content when dialog opens if ZPL printer is selected
  useEffect(() => {
    if (isOpen && shipmentId && isZplPrinter) {
      fetchZplContent();
    }
  }, [isOpen, shipmentId, isZplPrinter]);

  const fetchZplContent = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('label_zpl')
        .eq('id', parseInt(shipmentId))
        .single();
      
      if (!error && data?.label_zpl) {
        setZplContent(data.label_zpl);
        console.log('✅ ZPL content loaded for thermal printing');
      } else {
        console.warn('⚠️ No ZPL content available for this label');
      }
    } catch (err) {
      console.error('Failed to fetch ZPL content:', err);
    }
  };
  
  const getProxyUrl = (originalUrl: string) => {
    // Use environment variable to construct the Supabase URL to avoid Chrome blocking issues  
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gidrlosmhpvdcogrkidj.supabase.co';
    return `${supabaseUrl}/functions/v1/label-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  const handlePrint = () => {
    if (!labelUrl) return;
    
    const proxyUrl = getProxyUrl(labelUrl);
    console.log('Opening proxy URL for print:', proxyUrl);
    window.open(proxyUrl, '_blank');
  };
  
  const handleDownload = async () => {
    if (!labelUrl) return;
    
    setLoading(true);
    
    try {
      const proxyUrl = getProxyUrl(labelUrl);
      console.log('Attempting download via proxy:', proxyUrl);
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shipping-label-${shipmentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Proxy response not ok:', response.status, response.statusText);
        // Fallback: Open in new tab
        window.open(proxyUrl, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: Open in new tab
      const proxyUrl = getProxyUrl(labelUrl);
      window.open(proxyUrl, '_blank');
    }
    
    setLoading(false);
  };
  
  const handleClose = () => {
    onClose();
  };

  const handlePrintNode = async () => {
    if (!labelUrl) return;
    
    // Use ZPL for thermal printers if available
    if (isZplPrinter && zplContent) {
      console.log('🖨️ Printing ZPL to thermal printer');
      await printZPL(zplContent, `Shipping Label ${shipmentId}`);
    } else {
      // Fallback to PDF for regular printers
      const proxyUrl = getProxyUrl(labelUrl);
      await printPDF(proxyUrl, `Shipping Label ${shipmentId}`);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>
            <div className="flex items-center gap-2 text-green-500">
              <PackageCheck className="w-5 h-5" />
              <span>{title || 'Label Purchased'}</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col items-center gap-4">
          {labelUrl ? (
            <>
              {/* Shipment Details */}
              {orderDetails && (
                <div className="w-full bg-slate-50 p-3 rounded-lg text-sm">
                  <h3 className="font-medium text-gray-700 mb-2">Shipment Details</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <p className="text-gray-500">Carrier:</p>
                      <p className="font-medium">{orderDetails.carrier}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <p className="text-gray-500">Service:</p>
                      <p className="font-medium">{orderDetails.service}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <p className="text-gray-500">Tracking:</p>
                      <p className="font-medium truncate" title={orderDetails.trackingCode}>
                        {orderDetails.trackingCode}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-gray-500 text-xs">Tracking URL:</p>
                    <a 
                      href={orderDetails.trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs underline truncate block"
                    >
                      {orderDetails.trackingUrl}
                    </a>
                  </div>
                </div>
              )}
              
              {/* PrintNode Direct Print */}
              <div className="w-full space-y-2 bg-slate-50 p-3 rounded-lg border">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Direct Print to Label Printer (PrintNode)
                </label>
                {printers.length === 0 && !printLoading ? (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                    No printers found. Configure printers in Settings → Printer tab.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Select
                        value={selectedPrinter?.toString()}
                        onValueChange={(value) => setSelectedPrinter(Number(value))}
                        disabled={printLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={printLoading ? "Loading printers..." : "Select printer"} />
                        </SelectTrigger>
                        <SelectContent>
                          {printers.map((printer) => (
                            <SelectItem key={printer.id} value={printer.id.toString()}>
                              {printer.name} {printer.default ? '(Default)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handlePrintNode}
                        disabled={!selectedPrinter || printLoading || isZplPrinter}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send to Printer
                      </Button>
                    </div>
                    {isZplPrinter && selectedPrinter && (
                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                        <p className="font-medium mb-1">⚠️ Incompatible Printer Format</p>
                        <p className="text-xs">
                          This label is in PDF/PNG format, but you've selected a ZPL thermal printer. 
                          ZPL printers require raw ZPL code format. Please use "Browser Print" or "Download" instead, 
                          or select a standard office printer.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="flex items-center gap-2 flex-1"
                    disabled={loading}
                  >
                    <FileText className="h-4 w-4" />
                    {loading ? "Downloading..." : "Download"}
                  </Button>
                  <Button 
                    onClick={handlePrint}
                    variant="outline"
                    className="flex items-center gap-2 flex-1"
                  >
                    <Printer className="h-4 w-4" />
                    Browser Print
                  </Button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg w-full">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 text-center">
                    Shipping Label Preview
                  </div>
                  
                  {/* PDF Preview */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                    {!iframeError ? (
                      <iframe
                        src={getProxyUrl(labelUrl)}
                        className="w-full h-80 border-0"
                        title="Shipping Label Preview"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        onLoad={() => {
                          console.log('Label iframe loaded successfully');
                          setIframeError(false);
                        }}
                        onError={(e) => {
                          console.error('Label iframe error:', e);
                          setIframeError(true);
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-80 space-y-4">
                        <p className="text-muted-foreground">Unable to preview label in browser</p>
                        <Button 
                          onClick={handlePrint} 
                          variant="outline"
                          size="sm"
                        >
                          Open Label in New Tab
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    If the preview doesn't load, try opening in a new tab
                  </div>
                  
                  <Button 
                    onClick={() => {
                      const proxyUrl = getProxyUrl(labelUrl);
                      console.log('Opening label in new tab:', proxyUrl);
                      window.open(proxyUrl, '_blank');
                    }}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Open Label in New Tab
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <Button 
                onClick={handleClose}
                className="w-full"
                variant="success"
              >
                Done
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No label available for this shipment
              <Button 
                onClick={handleClose} 
                className="mt-4"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
