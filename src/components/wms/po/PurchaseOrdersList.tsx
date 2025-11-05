import { PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, X } from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrdersListProps {
  purchaseOrders: PurchaseOrder[];
  onView: (po: PurchaseOrder) => void;
  onCancel: (id: string) => void;
}

const statusColors = {
  pending: "default",
  partially_received: "secondary",
  received: "outline",
  closed: "outline",
  cancelled: "destructive"
} as const;

export const PurchaseOrdersList = ({ purchaseOrders, onView, onCancel }: PurchaseOrdersListProps) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO Number</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Expected Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No purchase orders found. Create your first PO to get started.
              </TableCell>
            </TableRow>
          ) : (
            purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.po_number}</TableCell>
                <TableCell>{po.vendor_name || "-"}</TableCell>
                <TableCell>
                  {po.expected_date ? format(new Date(po.expected_date), 'MMM d, yyyy') : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[po.status]}>
                    {po.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(po.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(po)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {po.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancel(po.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
