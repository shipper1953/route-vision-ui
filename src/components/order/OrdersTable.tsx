
import { OrderData } from "@/types/orderTypes";
import { useNavigate } from "react-router-dom";
import { Truck, Edit, Barcode } from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "./OrderStatus";
import { OrderShipmentInfo } from "./OrderShipmentInfo";

interface OrdersTableProps {
  orders: OrderData[];
  filteredOrders: OrderData[];
  highlightedOrderId: string | null;
  isLoading: boolean;
}

export const OrdersTable = ({ 
  orders, 
  filteredOrders, 
  highlightedOrderId, 
  isLoading 
}: OrdersTableProps) => {
  const navigate = useNavigate();

  const handleCreateShipmentForOrder = (orderId: string) => {
    // Navigate to create shipment page with the order ID
    navigate(`/create-shipment?orderId=${orderId}`);
  };

  const handleEditOrder = (orderId: string) => {
    // Navigate to edit order page
    navigate(`/edit-order/${orderId}`);
  };

  const handlePrintBarcode = (orderId: string) => {
    // Create a new window for printing the barcode
    const printWindow = window.open('', '_blank', 'width=400,height=200');
    if (!printWindow) return;

    // HTML content for the barcode label (3x1 inch)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label - ${orderId}</title>
          <style>
            @page {
              size: 3in 1in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 8px;
              font-family: Arial, sans-serif;
              width: 3in;
              height: 1in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              box-sizing: border-box;
            }
            .barcode {
              font-family: "Libre Barcode 128", monospace;
              font-size: 24px;
              margin-bottom: 4px;
            }
            .order-id {
              font-size: 12px;
              font-weight: bold;
            }
            @media print {
              body {
                background: white;
              }
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="barcode">*${orderId}*</div>
          <div class="order-id">${orderId}</div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for fonts to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-24 text-center">
          Loading orders...
        </TableCell>
      </TableRow>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-24 text-center">
          {orders.length === 0 ? 
            "No orders found in database. Create your first order!" : 
            "No orders match your search criteria."}
        </TableCell>
      </TableRow>
    );
  }

  console.log("Rendering orders table with", filteredOrders.length, "filtered orders");

  return (
    <>
      {filteredOrders.map((order) => (
        <TableRow 
          key={order.id} 
          className={highlightedOrderId === order.id ? "bg-blue-50" : ""}
        >
          <TableCell className="font-medium">{order.id}</TableCell>
          <TableCell>{order.customerName}</TableCell>
          <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
          <TableCell>{new Date(order.requiredDeliveryDate).toLocaleDateString()}</TableCell>
          <TableCell>{order.items}</TableCell>
          <TableCell>
            <OrderStatus status={order.status} />
          </TableCell>
          <TableCell>
            <OrderShipmentInfo shipment={order.shipment} />
          </TableCell>
          <TableCell className="text-right">${order.value}</TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">Details</Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePrintBarcode(order.id)}
                className="flex items-center gap-1"
              >
                <Barcode className="h-3.5 w-3.5" />
                Print
              </Button>
              {order.status === 'ready_to_ship' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditOrder(order.id)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {(order.status === 'ready_to_ship' || order.status === 'processing') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCreateShipmentForOrder(order.id)}
                  className="flex items-center gap-1"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Ship
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
