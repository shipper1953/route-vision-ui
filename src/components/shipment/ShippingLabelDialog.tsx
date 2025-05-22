
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { useState } from "react";

interface ShippingLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelUrl: string | undefined;
  shipmentId: string;
}

export const ShippingLabelDialog = ({
  isOpen,
  onClose,
  labelUrl,
  shipmentId
}: ShippingLabelDialogProps) => {
  const [loading, setLoading] = useState(false);
  
  const handlePrint = () => {
    if (!labelUrl) return;
    
    // Create a new window to print the label
    const printWindow = window.open(labelUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      });
    }
  };
  
  const handleDownload = () => {
    if (!labelUrl) return;
    
    setLoading(true);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = labelUrl;
    link.download = `shipping-label-${shipmentId}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Shipping Label</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {labelUrl ? (
            <>
              <div className="bg-gray-100 p-4 rounded-lg w-full overflow-hidden">
                <iframe
                  src={labelUrl}
                  className="w-full h-[500px] border-0"
                  title="Shipping Label"
                />
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Label
                </Button>
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <FileDown className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No label available for this shipment
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
