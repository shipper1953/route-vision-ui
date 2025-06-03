
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Warehouse } from "@/types/auth";
import { Plus, Edit, MapPin } from "lucide-react";

interface WarehouseManagementProps {
  companyId?: string;
}

export const WarehouseManagement = ({ companyId }: WarehouseManagementProps) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    is_default: false
  });

  useEffect(() => {
    if (companyId) {
      fetchWarehouses();
    }
  }, [companyId]);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const createWarehouse = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .insert([{
          ...newWarehouse,
          company_id: companyId
        }])
        .select()
        .single();

      if (error) throw error;

      setWarehouses([data, ...warehouses]);
      setNewWarehouse({
        name: '',
        address: {
          street1: '',
          street2: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        },
        is_default: false
      });
      setIsCreateDialogOpen(false);
      toast.success('Warehouse created successfully');
    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast.error('Failed to create warehouse');
    }
  };

  const setDefaultWarehouse = async (warehouseId: string) => {
    try {
      // First, unset all warehouses as default
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('company_id', companyId);

      // Then set the selected warehouse as default
      const { error } = await supabase
        .from('warehouses')
        .update({ is_default: true })
        .eq('id', warehouseId);

      if (error) throw error;

      // Update local state
      setWarehouses(warehouses.map(warehouse => ({
        ...warehouse,
        is_default: warehouse.id === warehouseId
      })));

      toast.success('Default warehouse updated');
    } catch (error) {
      console.error('Error setting default warehouse:', error);
      toast.error('Failed to set default warehouse');
    }
  };

  if (loading) {
    return <div>Loading warehouses...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Warehouse Management</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Warehouse</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="warehouse-name">Warehouse Name</Label>
                  <Input
                    id="warehouse-name"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                    placeholder="Enter warehouse name"
                  />
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Address</h4>
                  <div>
                    <Label htmlFor="street1">Street Address</Label>
                    <Input
                      id="street1"
                      value={newWarehouse.address.street1}
                      onChange={(e) => setNewWarehouse({ 
                        ...newWarehouse, 
                        address: { ...newWarehouse.address, street1: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="street2">Street Address 2 (Optional)</Label>
                    <Input
                      id="street2"
                      value={newWarehouse.address.street2}
                      onChange={(e) => setNewWarehouse({ 
                        ...newWarehouse, 
                        address: { ...newWarehouse.address, street2: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newWarehouse.address.city}
                        onChange={(e) => setNewWarehouse({ 
                          ...newWarehouse, 
                          address: { ...newWarehouse.address, city: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={newWarehouse.address.state}
                        onChange={(e) => setNewWarehouse({ 
                          ...newWarehouse, 
                          address: { ...newWarehouse.address, state: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={newWarehouse.address.zip}
                        onChange={(e) => setNewWarehouse({ 
                          ...newWarehouse, 
                          address: { ...newWarehouse.address, zip: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
                
                <Button onClick={createWarehouse} className="w-full">
                  Create Warehouse
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {warehouses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No warehouses configured. Add your first warehouse to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {warehouse.address.street1}
                      {warehouse.address.street2 && <br />}
                      {warehouse.address.street2}
                      <br />
                      {warehouse.address.city}, {warehouse.address.state} {warehouse.address.zip}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.is_default ? 'default' : 'secondary'}>
                      {warehouse.is_default ? 'Default' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!warehouse.is_default && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDefaultWarehouse(warehouse.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
