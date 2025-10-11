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
    // Generate ZPL code for barcode label (2" x 1")
    return `^XA
^FO50,30^BY2^BCN,60,Y,N,N
^FD${item.sku}^FS
^FO50,100^A0N,20,20^FD${item.name}^FS
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
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Direct Print to Label Printer</label>
            <div className="flex gap-2">
              <Select
                value={selectedPrinter?.toString()}
                onValueChange={(value) => setSelectedPrinter(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select printer" />
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
                className="border rounded-lg p-2 bg-white barcode-label"
                style={{
                  width: '2in',
                  height: '1in',
                  pageBreakAfter: 'always',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BarcodeGenerator value={item.sku} displayValue={true} height={35} width={1.8} />
                <p className="text-[8px] mt-0.5 truncate w-full text-center font-medium">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: 2in 1in;
              margin: 0;
            }
            html, body {
              width: 2in;
              height: 1in;
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
              width: 2in;
              height: auto;
            }
            .barcode-label {
              width: 2in !important;
              height: 1in !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              margin: 0 !important;
              padding: 0.05in !important;
              border: none !important;
              background: white !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
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
