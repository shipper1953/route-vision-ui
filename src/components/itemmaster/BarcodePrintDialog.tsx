import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarcodeGenerator } from './BarcodeGenerator';
import { Item } from '@/types/itemMaster';
import { Printer } from 'lucide-react';

interface BarcodePrintDialogProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodePrintDialog = ({ items, isOpen, onClose }: BarcodePrintDialogProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Print Barcodes ({items.length})</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="print-content">
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white barcode-label"
                style={{
                  width: '2in',
                  height: '1in',
                  pageBreakInside: 'avoid'
                }}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <BarcodeGenerator value={item.sku} displayValue={true} height={30} width={1.5} />
                  <p className="text-xs mt-1 truncate w-full text-center">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content,
            .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .barcode-label {
              width: 2in !important;
              height: 1in !important;
              page-break-inside: avoid;
              border: 1px solid #ddd;
              padding: 0.1in;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
};
