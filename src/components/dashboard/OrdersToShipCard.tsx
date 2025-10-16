import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CheckCircle } from 'lucide-react';
import { useDashboardOrders } from '@/hooks/useDashboardOrders';
import { format } from 'date-fns';

export const OrdersToShipCard = () => {
  const { orders, loading } = useDashboardOrders();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders to Ship
          </CardTitle>
          <CardDescription>Loading orders...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders to Ship
          </CardTitle>
          <CardDescription>Pending orders waiting to be processed</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No orders to ship right now
          </p>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Link 
            to="/orders" 
            className="text-sm text-primary hover:underline w-full text-center"
          >
            View All Orders →
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const getStatusVariant = (status: string) => {
    if (status === 'ready_to_ship') return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Orders to Ship
        </CardTitle>
        <CardDescription>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} waiting to be processed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="flex justify-between items-center py-2 border-b last:border-0">
            <div className="flex-1 min-w-0">
              <Link 
                to={`/orders/${order.id}/edit`}
                className="font-medium text-sm truncate text-primary hover:underline cursor-pointer block"
              >
                {order.order_id}
              </Link>
              <div className="text-xs text-muted-foreground truncate">
                {order.customer_name || order.customer_company || 'No customer name'}
              </div>
              {order.shipping_address?.city && (
                <div className="text-xs text-muted-foreground">
                  {order.shipping_address.city}, {order.shipping_address.state}
                </div>
              )}
            </div>
            <div className="text-right ml-4">
              <Link to={`/shipments/create?orderId=${order.order_id}`}>
                <Badge 
                  variant={getStatusVariant(order.status)} 
                  className="mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {order.status === 'ready_to_ship' ? 'Ready' : 'Processing'}
                </Badge>
              </Link>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(order.order_date), 'MMM d')}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Link 
          to="/orders" 
          className="text-sm text-primary hover:underline w-full text-center flex items-center justify-center gap-1"
        >
          View All Orders →
        </Link>
      </CardFooter>
    </Card>
  );
};
