
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    
    // Open the PDF in a new window for printing
    window.open(labelUrl, '_blank');
  };
  
  const handleDownload = async () => {
    if (!labelUrl) return;
    
    setLoading(true);
    
    try {
      // Fetch the PDF through CORS proxy
      const response = await fetch(labelUrl, {
        mode: 'no-cors'
      });
      
      // Fallback: Just open the URL in a new tab for download
      window.open(labelUrl, '_blank');
    } catch (error) {
      console.log('Direct download failed, opening in new tab:', error);
      // Fallback: Open the URL in a new tab
      window.open(labelUrl, '_blank');
    }
    
    setLoading(false);
  };
  
  const handleClose = () => {
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>
            <div className="flex items-center gap-2 text-green-500">
              <PackageCheck className="w-5 h-5" />
              <span>Label Purchased</span>
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
              
              <div className="bg-slate-50 p-4 rounded-lg w-full">
                <div className="text-center space-y-3">
                  <div className="text-sm text-gray-600">
                    Label preview is not available due to browser security restrictions.
                  </div>
                  <Button 
                    onClick={() => window.open(labelUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Open Label in New Tab
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 mt-2 w-full">
                <Button 
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2 flex-1"
                  size="sm"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2 flex-1"
                  disabled={loading}
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  Download
                </Button>
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
