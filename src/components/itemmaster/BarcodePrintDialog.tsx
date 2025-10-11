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
              margin: 0;
              padding: 0;
            }
            .barcode-label {
              width: 2in !important;
              height: 1in !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              margin: 0 !important;
              padding: 0.05in !important;
              border: none !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .barcode-label:last-child {
              page-break-after: auto !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
};
