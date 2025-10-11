import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeGenerator } from './BarcodeGenerator';
import { Item } from '@/types/itemMaster';
import { Printer, Send } from 'lucide-react';
import { usePrintNode } from '@/hooks/usePrintNode';

interface BarcodePrintDialogProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodePrintDialog = ({ items, isOpen, onClose }: BarcodePrintDialogProps) => {
  const { printers, selectedPrinter, setSelectedPrinter, loading, printZPL } = usePrintNode();

  const handlePrint = () => {
    window.print();
  };

  const generateZPL = (item: Item): string => {
    // Generate ZPL code for barcode label (4" x 2" at 203 DPI)
    // Label size: 812 x 406 dots (center point: 406, 203)
    // Barcode and name centered both horizontally and vertically as a group
    return `^XA
^FO250,120^BY4^BCN,90,Y,N,N
^FD${item.sku}^FS
^FO0,250^FB812,1,0,C,0^A0N,40,40^FD${item.name}^FS
^XZ`;
  };

  const handlePrintNode = async () => {
    if (!selectedPrinter) {
      return;
    }

    for (const item of items) {
      const zplCode = generateZPL(item);
      await printZPL(zplCode, `Barcode: ${item.sku}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Barcodes ({items.length})</DialogTitle>
        </DialogHeader>

        {/* PrintNode Printer Selection */}
        <div className="space-y-4 py-4 bg-slate-50 p-4 rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Direct Print to Label Printer (PrintNode)
            </label>
            {printers.length === 0 && !loading ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                No printers found. Configure printers in Settings → Printer tab.
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedPrinter?.toString()}
                  onValueChange={(value) => setSelectedPrinter(Number(value))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Loading printers..." : "Select printer"} />
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
                  disabled={!selectedPrinter || loading}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to Printer
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 border-t" />
          </div>

          <Button onClick={handlePrint} variant="outline" className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print via Browser
          </Button>
        </div>

        <div className="print-content">
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white barcode-label"
                style={{
                  width: '4in',
                  height: '2in',
                  pageBreakAfter: 'always',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <BarcodeGenerator value={item.sku} displayValue={true} height={80} width={3.5} />
                <p className="text-sm mt-1 truncate w-full text-center font-medium">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: 4in 2in;
              margin: 0;
            }
            html, body {
              width: 4in;
              height: 2in;
              margin: 0;
              padding: 0;
            }
            body * {
              visibility: hidden;
              display: none;
            }
            .print-content,
            .print-content * {
              visibility: visible;
              display: block;
            }
            .print-content {
              position: fixed;
              left: 0;
              top: 0;
              margin: 0;
              padding: 0;
              width: 4in;
              height: auto;
            }
            .barcode-label {
              width: 4in !important;
              height: 2in !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              margin: 0 !important;
              padding: 0.15in !important;
              border: none !important;
              background: white !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
              gap: 8px !important;
            }
            .barcode-label:last-child {
              page-break-after: auto !important;
            }
            canvas {
              display: block !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
};
