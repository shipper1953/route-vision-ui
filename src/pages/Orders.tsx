
import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, FileDown } from "lucide-react";

// Sample data - would be fetched from API in production
const orders = [
  { 
    id: "ORD-1234", 
    customer: "ABC Company", 
    date: "May 15, 2025", 
    items: 3, 
    status: "ready_to_ship", 
    value: "$529.99"
  },
  { 
    id: "ORD-1235", 
    customer: "XYZ Corp", 
    date: "May 14, 2025", 
    items: 1, 
    status: "processing", 
    value: "$129.50"
  },
  { 
    id: "ORD-1236", 
    customer: "Tech Solutions Inc", 
    date: "May 13, 2025", 
    items: 5, 
    status: "ready_to_ship", 
    value: "$1,245.00"
  },
  { 
    id: "ORD-1237", 
    customer: "Global Traders", 
    date: "May 13, 2025", 
    items: 2, 
    status: "shipped", 
    value: "$349.95"
  },
  { 
    id: "ORD-1238", 
    customer: "City Logistics", 
    date: "May 12, 2025", 
    items: 4, 
    status: "delivered", 
    value: "$789.40"
  }
];

const OrderStatus = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'processing':
        return { label: 'Processing', variant: 'outline' };
      case 'ready_to_ship':
        return { label: 'Ready to Ship', variant: 'warning' };
      case 'shipped':
        return { label: 'Shipped', variant: 'default' };
      case 'delivered':
        return { label: 'Delivered', variant: 'success' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const { label, variant } = getStatusDetails(status);
  return <Badge variant={variant as any}>{label}</Badge>;
};

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Orders</h1>
          <p className="text-muted-foreground">Manage your customer orders</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Button className="bg-tms-blue hover:bg-tms-blue-400" onClick={() => {}}>
            <Package className="mr-2 h-4 w-4" />
            Create Shipment
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>All Orders</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            Showing {filteredOrders.length} of {orders.length} orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.items}</TableCell>
                  <TableCell>
                    <OrderStatus status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">{order.value}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Orders;
