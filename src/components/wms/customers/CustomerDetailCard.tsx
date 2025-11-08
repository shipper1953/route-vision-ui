import { useState } from "react";
import { Customer } from "@/hooks/useCustomers";
import { useShopifyStores } from "@/hooks/useShopifyStores";
import { useItems } from "@/hooks/useItems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Store, 
  Package, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CustomerDetailCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
}

export const CustomerDetailCard = ({ customer, onEdit, onDelete }: CustomerDetailCardProps) => {
  const [storesOpen, setStoresOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  
  const { stores, loading: storesLoading } = useShopifyStores(customer.company_id);
  const { items, loading: itemsLoading } = useItems(customer.id);

  // Filter stores for this customer
  const customerStores = stores.filter(store => store.customer_id === customer.id);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{customer.name}</CardTitle>
              <Badge variant={customer.is_active ? "default" : "secondary"}>
                {customer.is_active ? "Active" : "Inactive"}
              </Badge>
              {customer.code && (
                <Badge variant="outline">{customer.code}</Badge>
              )}
            </div>
            <CardDescription className="space-y-1">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3 w-3" />
                  {typeof customer.address === 'string' ? customer.address : 
                    `${customer.address.street1 || ''}, ${customer.address.city || ''}, ${customer.address.state || ''} ${customer.address.zip || ''}`}
                </div>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(customer)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(customer.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shopify Stores Section */}
        <Collapsible open={storesOpen} onOpenChange={setStoresOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span>Shopify Stores ({customerStores.length})</span>
              </div>
              {storesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {storesLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading stores...</p>
            ) : customerStores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No Shopify stores connected
              </p>
            ) : (
              <div className="space-y-2">
                {customerStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{store.store_name || store.store_url}</p>
                        <Badge variant={store.is_active ? "default" : "secondary"} className="text-xs">
                          {store.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{store.store_url}</p>
                      {store.last_sync_at && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(store.last_sync_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Inventory Section */}
        <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Inventory Items ({items.length})</span>
              </div>
              {inventoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {itemsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading inventory...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No inventory items allocated
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.length}×{item.width}×{item.height}
                        </TableCell>
                        <TableCell className="text-sm">{item.weight} oz</TableCell>
                        <TableCell>
                          <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {customer.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
