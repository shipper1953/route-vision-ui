
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useState } from "react";

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

  const handlePrintAll = async () => {
    setIsPrinting(true);
    
    // Print each label in sequence
    for (const label of shipmentLabels) {
      if (label.labelUrl) {
        const printWindow = window.open(label.labelUrl, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          });
          // Wait a bit between opening windows
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    setIsPrinting(false);
  };

  const handleDownloadAll = () => {
    shipmentLabels.forEach((label, index) => {
      if (label.labelUrl) {
        const link = document.createElement('a');
        link.href = label.labelUrl;
        link.download = `shipping-label-${label.orderId}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
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
                          const printWindow = window.open(label.labelUrl, '_blank');
                          if (printWindow) {
                            printWindow.addEventListener('load', () => {
                              setTimeout(() => {
                                printWindow.print();
                              }, 500);
                            });
                          }
                        }
                      }}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (label.labelUrl) {
                          const link = document.createElement('a');
                          link.href = label.labelUrl;
                          link.download = `shipping-label-${label.orderId}.pdf`;
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
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
                    <iframe
                      src={label.labelUrl}
                      className="w-full h-full border-0 scale-75 origin-top-left"
                      title={`Shipping Label ${label.orderId}`}
                    />
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
