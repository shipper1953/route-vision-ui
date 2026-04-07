
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Customer {
  id: string;
  name: string;
}

interface OrdersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  customerFilter?: string;
  onCustomerFilterChange?: (value: string) => void;
  dateFrom?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  dateTo?: Date;
  onDateToChange: (date: Date | undefined) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
}

export const OrdersFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  customerFilter = "all",
  onCustomerFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showAdvancedFilters,
  onToggleAdvancedFilters
}: OrdersFiltersProps) => {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!userProfile?.company_id) return;
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('name');
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, [userProfile?.company_id]);

  return (
    <div className="space-y-4">
      {/* Search and basic filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search orders by customer, ID, or email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
            <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {onCustomerFilterChange && (
          <Select value={customerFilter} onValueChange={onCustomerFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Advanced filters toggle */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={onToggleAdvancedFilters}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>

      {/* Advanced filters */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label>Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={onDateFromChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={onDateToChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};
