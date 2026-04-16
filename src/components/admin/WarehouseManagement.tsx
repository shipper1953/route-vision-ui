
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Warehouse, Company } from "@/types/auth";
import { Plus, Edit, MapPin, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ShopifyLocation {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  isActive: boolean;
}

interface WarehouseManagementProps {
  companyId?: string;
}

interface WarehouseWithCompany extends Warehouse {
  company_name?: string;
}

export const WarehouseManagement = ({ companyId }: WarehouseManagementProps) => {
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const [warehouses, setWarehouses] = useState<WarehouseWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    phone: '',
    email: '',
    company_id: companyId || '',
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    is_default: false,
    shopify_location_id: ''
  });
  const [shopifyLocations, setShopifyLocations] = useState<ShopifyLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const fetchShopifyLocations = useCallback(async (targetCompanyId?: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-list-locations', {
        body: { companyId: targetCompanyId }
      });
      if (error) throw error;
      setShopifyLocations(data?.locations || []);
    } catch (err) {
      console.error('Error fetching Shopify locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
      fetchAllWarehouses();
    } else if (companyId) {
      fetchWarehouses();
    }
  }, [companyId, isSuperAdmin]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, email, phone, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setCompanies((data || []) as Company[]);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchAllWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
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
    const targetCompanyId = isSuperAdmin ? newWarehouse.company_id : companyId;
    if (!targetCompanyId) {
      toast.error('Please select a company');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .insert([{
          name: newWarehouse.name,
          phone: newWarehouse.phone,
          email: newWarehouse.email,
          address: newWarehouse.address,
          is_default: newWarehouse.is_default,
          shopify_location_id: newWarehouse.shopify_location_id || null,
          company_id: targetCompanyId
        }])
        .select()
        .single();

      if (error) throw error;

      setWarehouses([data, ...warehouses]);
      setNewWarehouse({
        name: '',
        phone: '',
        email: '',
        company_id: companyId || '',
        address: { street1: '', street2: '', city: '', state: '', zip: '', country: 'US' },
        is_default: false,
        shopify_location_id: ''
      });
      setIsCreateDialogOpen(false);
      toast.success('Warehouse created successfully');
    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast.error('Failed to create warehouse');
    }
  };

  const setDefaultWarehouse = async (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return;
    try {
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('company_id', warehouse.company_id);

      const { error } = await supabase
        .from('warehouses')
        .update({ is_default: true })
        .eq('id', warehouseId);

      if (error) throw error;

      setWarehouses(warehouses.map(w => ({
        ...w,
        is_default: w.company_id === warehouse.company_id ? w.id === warehouseId : w.is_default
      })));
      toast.success('Default warehouse updated');
    } catch (error) {
      console.error('Error setting default warehouse:', error);
      toast.error('Failed to set default warehouse');
    }
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsEditDialogOpen(true);
  };

  const updateWarehouse = async () => {
    if (!editingWarehouse) return;
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({
          name: editingWarehouse.name,
          phone: editingWarehouse.phone,
          email: editingWarehouse.email,
          address: editingWarehouse.address,
        })
        .eq('id', editingWarehouse.id);

      if (error) throw error;

      setWarehouses(warehouses.map(w =>
        w.id === editingWarehouse.id ? editingWarehouse : w
      ));
      setIsEditDialogOpen(false);
      setEditingWarehouse(null);
      toast.success('Warehouse updated successfully');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast.error('Failed to update warehouse');
    }
  };

  const getCompanyName = (cid: string) => {
    return companies.find(c => c.id === cid)?.name || 'Unknown';
  };

  const filteredWarehouses = filterCompanyId === 'all'
    ? warehouses
    : warehouses.filter(w => w.company_id === filterCompanyId);

  if (loading) {
    return <div>Loading warehouses...</div>;
  }

  if (!isSuperAdmin && !companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>Warehouse Management</CardTitle>
          <div className="flex items-center gap-3">
            {isSuperAdmin && companies.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                  {isSuperAdmin && (
                    <div>
                      <Label>Company *</Label>
                      <Select value={newWarehouse.company_id} onValueChange={(v) => setNewWarehouse({ ...newWarehouse, company_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="warehouse-name">Warehouse Name</Label>
                    <Input
                      id="warehouse-name"
                      value={newWarehouse.name}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                      placeholder="Enter warehouse name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="warehouse-phone">Phone</Label>
                      <Input
                        id="warehouse-phone"
                        value={newWarehouse.phone}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
                        placeholder="555-123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="warehouse-email">Email</Label>
                      <Input
                        id="warehouse-email"
                        type="email"
                        value={newWarehouse.email}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, email: e.target.value })}
                        placeholder="warehouse@company.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="shopify-location-id">
                      Shopify Location ID <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="shopify-location-id"
                      value={newWarehouse.shopify_location_id}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, shopify_location_id: e.target.value })}
                      placeholder="gid://shopify/Location/123456789"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your Shopify fulfillment location ID to automatically route POs/Transfers to this warehouse
                    </p>
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
        </div>
      </CardHeader>

      {/* Edit Warehouse Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
          </DialogHeader>
          {editingWarehouse && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-warehouse-name">Warehouse Name</Label>
                <Input
                  id="edit-warehouse-name"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({
                    ...editingWarehouse,
                    name: e.target.value
                  })}
                  placeholder="Enter warehouse name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-warehouse-phone">Phone</Label>
                  <Input
                    id="edit-warehouse-phone"
                    value={editingWarehouse.phone || ''}
                    onChange={(e) => setEditingWarehouse({
                      ...editingWarehouse,
                      phone: e.target.value
                    })}
                    placeholder="555-123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-warehouse-email">Email</Label>
                  <Input
                    id="edit-warehouse-email"
                    type="email"
                    value={editingWarehouse.email || ''}
                    onChange={(e) => setEditingWarehouse({
                      ...editingWarehouse,
                      email: e.target.value
                    })}
                    placeholder="warehouse@company.com"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Address</h4>
                <div>
                  <Label htmlFor="edit-street1">Street Address</Label>
                  <Input
                    id="edit-street1"
                    value={editingWarehouse.address.street1}
                    onChange={(e) => setEditingWarehouse({
                      ...editingWarehouse,
                      address: { ...editingWarehouse.address, street1: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-street2">Street Address 2 (Optional)</Label>
                  <Input
                    id="edit-street2"
                    value={editingWarehouse.address.street2 || ''}
                    onChange={(e) => setEditingWarehouse({
                      ...editingWarehouse,
                      address: { ...editingWarehouse.address, street2: e.target.value }
                    })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={editingWarehouse.address.city}
                      onChange={(e) => setEditingWarehouse({
                        ...editingWarehouse,
                        address: { ...editingWarehouse.address, city: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={editingWarehouse.address.state}
                      onChange={(e) => setEditingWarehouse({
                        ...editingWarehouse,
                        address: { ...editingWarehouse.address, state: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-zip">ZIP Code</Label>
                    <Input
                      id="edit-zip"
                      value={editingWarehouse.address.zip}
                      onChange={(e) => setEditingWarehouse({
                        ...editingWarehouse,
                        address: { ...editingWarehouse.address, zip: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-shopify-location-id">
                  Shopify Location ID <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="edit-shopify-location-id"
                  value={editingWarehouse.shopify_location_id || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, shopify_location_id: e.target.value })}
                  placeholder="gid://shopify/Location/123456789"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your Shopify fulfillment location ID to automatically route POs/Transfers to this warehouse
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={updateWarehouse} className="flex-1">
                  Update Warehouse
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CardContent>
        {filteredWarehouses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {filterCompanyId !== 'all'
              ? 'No warehouses found for this company.'
              : 'No warehouses configured. Add your first warehouse to get started.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {isSuperAdmin && <TableHead>Company</TableHead>}
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Shopify Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{getCompanyName(warehouse.company_id)}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm">
                      {warehouse.phone && <div>{warehouse.phone}</div>}
                      {warehouse.email && <div className="text-muted-foreground">{warehouse.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {warehouse.address?.street1}
                      {warehouse.address?.street2 && <br />}
                      {warehouse.address?.street2}
                      <br />
                      {warehouse.address?.city}, {warehouse.address?.state} {warehouse.address?.zip}
                    </div>
                  </TableCell>
                  <TableCell>
                    {warehouse.shopify_location_id ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]" title={warehouse.shopify_location_id}>
                          {warehouse.shopify_location_id}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not mapped</span>
                    )}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWarehouse(warehouse)}
                      >
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
