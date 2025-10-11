
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BulkShippingLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentLabels: Array<{
    orderId: string;
    labelUrl: string;
    trackingNumber: string;
    carrier: string;
    service: string;
  }>;
}

export const BulkShippingLabelDialog = ({
  isOpen,
  onClose,
  shipmentLabels
}: BulkShippingLabelDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({});

  const getProxyUrl = (originalUrl: string) => {
    // Use environment variable to construct the Supabase URL to avoid Chrome blocking issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gidrlosmhpvdcogrkidj.supabase.co';
    return `${supabaseUrl}/functions/v1/label-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  const handlePrintAll = async () => {
    setIsPrinting(true);
    
    // Print each label in sequence
    for (const label of shipmentLabels) {
      if (label.labelUrl) {
        const proxyUrl = getProxyUrl(label.labelUrl);
        window.open(proxyUrl, '_blank');
        // Wait a bit between opening windows
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsPrinting(false);
  };

  const handleDownloadAll = async () => {
    for (const [index, label] of shipmentLabels.entries()) {
      if (label.labelUrl) {
        try {
          const proxyUrl = getProxyUrl(label.labelUrl);
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `shipping-label-${label.orderId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        } catch (error) {
          console.error(`Failed to download label for order ${label.orderId}:`, error);
        }
        
        // Add delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-600">
            Bulk Shipping Labels Ready ({shipmentLabels.length} labels)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2 p-4 bg-muted/20 rounded-lg">
            <Button
              onClick={handlePrintAll}
              disabled={isPrinting}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? "Printing..." : "Print All Labels"}
            </Button>
            <Button
              onClick={handleDownloadAll}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>

          {/* Labels list */}
          <div className="space-y-3">
            {shipmentLabels.map((label, index) => (
              <div key={label.orderId} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">Order {label.orderId}</span>
                    <div className="text-sm text-muted-foreground">
                      {label.carrier} {label.service} • {label.trackingNumber}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (label.labelUrl) {
                          const proxyUrl = getProxyUrl(label.labelUrl);
                          window.open(proxyUrl, '_blank');
                        }
                      }}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (label.labelUrl) {
                          try {
                            const proxyUrl = getProxyUrl(label.labelUrl);
                            const response = await fetch(proxyUrl);
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `shipping-label-${label.orderId}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            }
                          } catch (error) {
                            console.error('Download failed:', error);
                          }
                        }
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Label preview */}
                {label.labelUrl && (
                  <div className="bg-slate-50 rounded p-2 h-32 overflow-hidden">
                    {!iframeErrors[label.orderId] ? (
                      <iframe
                        src={getProxyUrl(label.labelUrl)}
                        className="w-full h-full border-0 scale-75 origin-top-left"
                        title={`Shipping Label ${label.orderId}`}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        onLoad={() => setIframeErrors(prev => ({ ...prev, [label.orderId]: false }))}
                        onError={() => setIframeErrors(prev => ({ ...prev, [label.orderId]: true }))}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <p className="text-xs text-muted-foreground">Preview unavailable</p>
                        <Button 
                          onClick={() => window.open(getProxyUrl(label.labelUrl), '_blank')} 
                          variant="outline" 
                          size="sm"
                        >
                          Open
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
