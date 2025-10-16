import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Package } from "lucide-react";
import { toast } from "sonner";
import { findOrdersMissingCartonization, recalculateBulkOrderCartonization } from "@/utils/recalculateOrderCartonization";
import { useAuth } from "@/hooks/useAuth";

export const RecalculateBoxesDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ordersToProcess, setOrdersToProcess] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [successful, setSuccessful] = useState(0);
  const { userProfile } = useAuth();

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const companyId = userProfile?.role === 'super_admin' ? undefined : userProfile?.company_id;
      const orderIds = await findOrdersMissingCartonization(companyId);
      setOrdersToProcess(orderIds);
      
      if (orderIds.length === 0) {
        toast.success("All orders have box recommendations!");
      } else {
        toast.info(`Found ${orderIds.length} orders without box recommendations`);
      }
    } catch (error) {
      console.error('Error scanning for orders:', error);
      toast.error('Failed to scan for orders');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRecalculate = async () => {
    if (ordersToProcess.length === 0) return;
    
    setIsProcessing(true);
    setProcessed(0);
    setSuccessful(0);
    setProgress(0);

    try {
      const results = await recalculateBulkOrderCartonization(
        ordersToProcess,
        (current, total, result) => {
          setProcessed(current);
          if (result.success) {
            setSuccessful(s => s + 1);
          }
          setProgress((current / total) * 100);
        }
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(`Successfully calculated boxes for all ${successCount} orders!`);
      } else {
        toast.warning(`Calculated ${successCount} boxes, ${failCount} failed`);
      }

      // Reset and close
      setOrdersToProcess([]);
      setProgress(0);
      setProcessed(0);
      setSuccessful(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Error recalculating boxes:', error);
      toast.error('Failed to recalculate boxes');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          Recalculate Boxes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recalculate Box Recommendations</DialogTitle>
          <DialogDescription>
            Find and recalculate box recommendations for orders that are missing them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {ordersToProcess.length > 0 ? (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Orders to process:</span>
                <span className="text-lg font-bold">{ordersToProcess.length}</span>
              </div>
              
              {isProcessing && (
                <>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Processing...</span>
                    <span>{processed} / {ordersToProcess.length}</span>
                  </div>
                  <div className="text-sm text-primary">
                    ✓ {successful} successful
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {isScanning ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <p>Scanning orders...</p>
                </div>
              ) : (
                <p>Click "Scan Orders" to find orders without box recommendations</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={isScanning || isProcessing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Orders
          </Button>
          <Button
            onClick={handleRecalculate}
            disabled={ordersToProcess.length === 0 || isProcessing}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Recalculate {ordersToProcess.length > 0 && `(${ordersToProcess.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
