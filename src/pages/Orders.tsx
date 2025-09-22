import { useSearchParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OrdersHeader } from "@/components/order/OrdersHeader";
import { OrdersSearch } from "@/components/order/OrdersSearch";
import { OrdersTable } from "@/components/order/OrdersTable";
import { OrdersPagination } from "@/components/order/OrdersPagination";
import { usePaginatedOrders } from "@/hooks/usePaginatedOrders";

const Orders = () => {
  const [searchParams] = useSearchParams();
  const highlightedOrderId = searchParams.get('highlight');
  
  const {
    orders,
    loading,
    searchLoading,
    currentPage,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    searchTerm,
    setSearchTerm,
    goToPage,
    nextPage,
    previousPage,
    pageSize
  } = usePaginatedOrders(10);

  return (
    <TmsLayout>
      <OrdersHeader />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Orders</CardTitle>
          <OrdersSearch 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filteredCount={orders.length}
            totalCount={totalCount}
            isLoading={loading || searchLoading}
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size={24} />
            </div>
          ) : (
            <>
              <div className="p-6">
                <OrdersTable 
                  orders={orders}
                  loading={searchLoading}
                />
              </div>
              
              {totalCount > 0 && (
                <OrdersPagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
                  onPageChange={goToPage}
                  onNextPage={nextPage}
                  onPreviousPage={previousPage}
                  loading={searchLoading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default Orders;
