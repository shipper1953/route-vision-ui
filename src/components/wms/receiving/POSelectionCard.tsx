import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import { format } from "date-fns";

interface POSelectionCardProps {
  po: any;
  onStartReceiving: (poId: string, warehouseId: string) => void;
}

export const POSelectionCard = ({ po, onStartReceiving }: POSelectionCardProps) => {
  return (
    <Card className="hover:border-primary transition-colors cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{po.po_number}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {po.customers?.name || 'Unknown Customer'}
            </p>
          </div>
          <Badge variant={po.status === 'pending' ? 'default' : 'secondary'}>
            {po.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Vendor:</span> {po.vendor_name || '-'}</p>
          {po.expected_date && (
            <p><span className="text-muted-foreground">Expected:</span> {format(new Date(po.expected_date), 'MMM d, yyyy')}</p>
          )}
          <p><span className="text-muted-foreground">Line Items:</span> {po.po_line_items?.length || 0}</p>
        </div>
        <Button 
          className="w-full" 
          onClick={() => onStartReceiving(po.id, po.warehouse_id)}
        >
          <PackageOpen className="mr-2 h-4 w-4" />
          Start Receiving
        </Button>
      </CardContent>
    </Card>
  );
};
