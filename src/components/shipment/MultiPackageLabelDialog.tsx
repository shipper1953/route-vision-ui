import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, PackageCheck } from "lucide-react";
import { useState } from "react";
import { usePrintNode } from "@/hooks/usePrintNode";
import { toast } from "sonner";

interface MultiPackageLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  packageLabels: Array<{
    packageIndex: number;
    label: any;
    rate: any;
  }>;
}

export const MultiPackageLabelDialog = ({
  isOpen,
  onClose,
  packageLabels
}: MultiPackageLabelDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [iframeErrors, setIframeErrors] = useState<Record<number, boolean>>({});
  const { printers, selectedPrinter, setSelectedPrinter, printPDF } = usePrintNode();

  const getProxyUrl = (originalUrl: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gidrlosmhpvdcogrkidj.supabase.co';
    return `${supabaseUrl}/functions/v1/label-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  const getLabelUrl = (label: any) => {
    return label?.postage_label?.label_url || label?.label_url;
  };

  const getTrackingNumber = (label: any) => {
    return label?.tracking_code || label?.tracking_number || 'N/A';
  };

  const getCarrier = (label: any) => {
    return label?.selected_rate?.carrier || 'Unknown';
  };

  const getService = (label: any) => {
    return label?.selected_rate?.service || 'Unknown';
  };

  const handlePrintAll = async () => {
    setIsPrinting(true);
    
    for (const pkg of packageLabels) {
      const labelUrl = getLabelUrl(pkg.label);
      if (labelUrl) {
        const proxyUrl = getProxyUrl(labelUrl);
        window.open(proxyUrl, '_blank');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsPrinting(false);
  };

  const handlePrintNodeAll = async () => {
    if (!selectedPrinter) {
      toast.error("Please select a printer first");
      return;
    }

    setIsPrinting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const pkg of packageLabels) {
      const labelUrl = getLabelUrl(pkg.label);
      if (labelUrl) {
        try {
          const success = await printPDF(labelUrl, `Package ${pkg.packageIndex + 1}`);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to print package ${pkg.packageIndex + 1}:`, error);
          errorCount++;
        }
      }
    }

    setIsPrinting(false);
    
    if (successCount > 0) {
      toast.success(`Successfully printed ${successCount} label(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to print ${errorCount} label(s)`);
    }
  };

  const getFileExtension = (url: string) => {
    // Extract extension from URL (e.g., .pdf or .png)
    const match = url.match(/\.(pdf|png|jpg|jpeg)(\?|$)/i);
    return match ? match[1].toLowerCase() : 'pdf';
  };

  const handleDownloadAll = async () => {
    for (const pkg of packageLabels) {
      const labelUrl = getLabelUrl(pkg.label);
      if (labelUrl) {
        try {
          const proxyUrl = getProxyUrl(labelUrl);
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const extension = getFileExtension(labelUrl);
            link.download = `package-${pkg.packageIndex + 1}-label.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(`Downloaded package ${pkg.packageIndex + 1}`);
          } else {
            toast.error(`Failed to download package ${pkg.packageIndex + 1}`);
          }
        } catch (error) {
          console.error(`Failed to download package ${pkg.packageIndex + 1}:`, error);
          toast.error(`Error downloading package ${pkg.packageIndex + 1}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <PackageCheck className="w-5 h-5" />
            <span>Multi-Package Labels Ready ({packageLabels.length} packages)</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* PrintNode Printer Selection */}
          {printers.length > 0 && (
            <div className="p-4 bg-muted/20 rounded-lg space-y-2">
              <label className="text-sm font-medium">Direct Print to Label Printer</label>
              <Select
                value={selectedPrinter?.toString() || ""}
                onValueChange={(value) => setSelectedPrinter(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a printer" />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id.toString()}>
                      {printer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 p-4 bg-muted/20 rounded-lg">
            {selectedPrinter ? (
              <Button
                onClick={handlePrintNodeAll}
                disabled={isPrinting}
                className="flex-1 gap-2"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Printing..." : "Print All to Printer"}
              </Button>
            ) : (
              <Button
                onClick={handlePrintAll}
                disabled={isPrinting}
                className="flex-1 gap-2"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Printing..." : "Browser Print All"}
              </Button>
            )}
            <Button
              onClick={handleDownloadAll}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>

          {/* Package labels list */}
          <div className="space-y-3">
            {packageLabels.map((pkg) => {
              const labelUrl = getLabelUrl(pkg.label);
              const trackingNumber = getTrackingNumber(pkg.label);
              const carrier = getCarrier(pkg.label);
              const service = getService(pkg.label);
              
              return (
                <div key={pkg.packageIndex} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">Package {pkg.packageIndex + 1}</span>
                      <div className="text-sm text-muted-foreground">
                        {carrier} {service} • {trackingNumber}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (labelUrl) {
                            const proxyUrl = getProxyUrl(labelUrl);
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
                          if (labelUrl) {
                            try {
                              const proxyUrl = getProxyUrl(labelUrl);
                              const response = await fetch(proxyUrl);
                              
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                const extension = getFileExtension(labelUrl);
                                link.download = `package-${pkg.packageIndex + 1}-label.${extension}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                toast.success(`Downloaded package ${pkg.packageIndex + 1}`);
                              } else {
                                toast.error(`Download failed for package ${pkg.packageIndex + 1}`);
                              }
                            } catch (error) {
                              console.error('Download failed:', error);
                              toast.error('Download failed');
                            }
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Label preview */}
                  {labelUrl && (
                    <div className="bg-slate-50 rounded p-2 h-32 overflow-hidden">
                      {!iframeErrors[pkg.packageIndex] ? (
                        <iframe
                          src={getProxyUrl(labelUrl)}
                          className="w-full h-full border-0 scale-75 origin-top-left"
                          title={`Package ${pkg.packageIndex + 1} Label`}
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                          onLoad={() => setIframeErrors(prev => ({ ...prev, [pkg.packageIndex]: false }))}
                          onError={() => setIframeErrors(prev => ({ ...prev, [pkg.packageIndex]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-2">
                          <p className="text-xs text-muted-foreground">Preview unavailable</p>
                          <Button 
                            onClick={() => window.open(getProxyUrl(labelUrl), '_blank')} 
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
              );
            })}
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
