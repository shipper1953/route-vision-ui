
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, PackageCheck } from "lucide-react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

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
}

export const ShippingLabelDialog = ({
  isOpen,
  onClose,
  labelUrl,
  shipmentId,
  orderDetails
}: ShippingLabelDialogProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
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
  
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center space-x-2">
              <PackageCheck className="w-5 h-5 text-green-500" />
              <span>Label Purchased Successfully</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {labelUrl ? (
            <>
              {/* Shipment Details */}
              {orderDetails && (
                <div className="w-full bg-gray-50 p-4 rounded-lg mb-2">
                  <h3 className="font-medium text-gray-700 mb-2">Shipment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Carrier:</p>
                      <p className="font-medium">{orderDetails.carrier}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Service:</p>
                      <p className="font-medium">{orderDetails.service}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tracking Number:</p>
                      <p className="font-medium">{orderDetails.trackingCode}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date Created:</p>
                      <p className="font-medium">{orderDetails.createdAt}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-500">Tracking URL:</p>
                      <a 
                        href={orderDetails.trackingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {orderDetails.trackingUrl}
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-100 p-4 rounded-lg w-full overflow-hidden">
                <iframe
                  src={labelUrl}
                  className="w-full h-[400px] border-0"
                  title="Shipping Label"
                />
              </div>
              
              <div className="flex gap-3 mt-4 w-full">
                <Button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 flex-1"
                >
                  <Printer className="h-4 w-4" />
                  Print Label
                </Button>
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2 flex-1"
                  disabled={loading}
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
              
              <Separator className="my-2" />
              
              <Button 
                onClick={handleClose}
                className="w-full"
                variant="default"
              >
                Close and Go to Orders
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
      </DialogContent>
    </Dialog>
  );
};
