import { useState } from "react";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { CreateCustomerDialog } from "@/components/wms/customers/CreateCustomerDialog";
import { CustomersList } from "@/components/wms/customers/CustomersList";
import { CustomerDetailCard } from "@/components/wms/customers/CustomerDetailCard";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Customers = () => {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "cards">("cards");

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your 3PL customers
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Customers View */}
        {loading && customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid gap-4">
            {filteredCustomers.map((customer) => (
              <CustomerDetailCard
                key={customer.id}
                customer={customer}
                onEdit={setEditingCustomer}
                onDelete={handleDelete}
              />
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground">No customers found.</p>
              </div>
            )}
          </div>
        ) : (
          <CustomersList
            customers={filteredCustomers}
            onEdit={setEditingCustomer}
            onDelete={handleDelete}
          />
        )}

        {/* Create Dialog */}
        <CreateCustomerDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={createCustomer}
        />
      </div>
    </TmsLayout>
  );
};

export default Customers;
