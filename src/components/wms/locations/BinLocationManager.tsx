import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouseLocations, WarehouseLocation } from "@/hooks/useWarehouseLocations";
import { useBinTransfers, BinTransfer } from "@/hooks/useBinTransfers";
import { useWarehouses } from "@/hooks/useWarehouses";
import { MapPin, ArrowRight, Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";

export const BinLocationManager = () => {
  const { locations, loading: locationsLoading, createLocation, fetchLocations } = useWarehouseLocations();
  const { loading: transferLoading, transferBin } = useBinTransfers();
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  
  const [newLocation, setNewLocation] = useState({
    warehouse_id: '',
    name: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    location_type: 'storage' as const,
    is_active: true
  });

  // Set default warehouse when warehouses load
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0];
      setSelectedWarehouse(defaultWarehouse.id);
    }
  }, [warehouses]);

  // Fetch locations when selected warehouse changes
  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const [transfer, setTransfer] = useState<Partial<BinTransfer>>({
    from_location_id: '',
    to_location_id: '',
    quantity: 1,
    reason: 'relocation'
  });

  const handleCreateLocation = async () => {
    if (!newLocation.warehouse_id) {
      toast.error('Please select a warehouse');
      return;
    }
    
    try {
      await createLocation(newLocation);
      setShowCreate(false);
      setNewLocation({
        warehouse_id: '',
        name: '',
        zone: '',
        aisle: '',
        rack: '',
        shelf: '',
        bin: '',
        location_type: 'storage',
        is_active: true
      });
      toast.success('Location created successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTransfer = async () => {
    if (!transfer.item_id || !transfer.from_location_id || !transfer.to_location_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await transferBin(transfer as BinTransfer);
      setShowTransfer(false);
      setTransfer({
        from_location_id: '',
        to_location_id: '',
        quantity: 1,
        reason: 'relocation'
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const storageLocations = locations.filter(l => l.location_type === 'storage');
  const receivingLocations = locations.filter(l => l.location_type === 'receiving');
  const shippingLocations = locations.filter(l => l.location_type === 'shipping');

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bin Location Management</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowTransfer(!showTransfer)} variant="outline">
            <ArrowRight className="h-4 w-4 mr-2" />
            Transfer Bin
          </Button>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Location
          </Button>
        </div>
      </div>

      {/* Warehouse Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2 min-w-fit">
              <Warehouse className="h-4 w-4" />
              Warehouse:
            </Label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(wh => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                    {wh.is_default && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Select
                  value={newLocation.warehouse_id}
                  onValueChange={(value) => setNewLocation({ ...newLocation, warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location Name *</Label>
                <Input
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder="A-01-01-A"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={newLocation.location_type}
                  onValueChange={(value: any) => setNewLocation({ ...newLocation, location_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="receiving">Receiving</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input
                  value={newLocation.zone}
                  onChange={(e) => setNewLocation({ ...newLocation, zone: e.target.value })}
                  placeholder="A"
                />
              </div>
              <div className="space-y-2">
                <Label>Aisle</Label>
                <Input
                  value={newLocation.aisle}
                  onChange={(e) => setNewLocation({ ...newLocation, aisle: e.target.value })}
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <Label>Rack</Label>
                <Input
                  value={newLocation.rack}
                  onChange={(e) => setNewLocation({ ...newLocation, rack: e.target.value })}
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <Label>Shelf</Label>
                <Input
                  value={newLocation.shelf}
                  onChange={(e) => setNewLocation({ ...newLocation, shelf: e.target.value })}
                  placeholder="A"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateLocation} 
                disabled={locationsLoading || !newLocation.name || !newLocation.warehouse_id}
              >
                Create Location
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showTransfer && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Bin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Location *</Label>
                <Select
                  value={transfer.from_location_id}
                  onValueChange={(value) => setTransfer({ ...transfer, from_location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Location *</Label>
                <Select
                  value={transfer.to_location_id}
                  onValueChange={(value) => setTransfer({ ...transfer, to_location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={transfer.quantity}
                  onChange={(e) => setTransfer({ ...transfer, quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select
                  value={transfer.reason}
                  onValueChange={(value) => setTransfer({ ...transfer, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relocation">Relocation</SelectItem>
                    <SelectItem value="consolidation">Consolidation</SelectItem>
                    <SelectItem value="replenishment">Replenishment</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTransfer} disabled={transferLoading}>
                Transfer
              </Button>
              <Button variant="outline" onClick={() => setShowTransfer(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Storage Locations ({storageLocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storageLocations.slice(0, 10).map(loc => (
                <div key={loc.id} className="text-sm p-2 bg-accent/50 rounded">
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Zone {loc.zone} • {getWarehouseName(loc.warehouse_id)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              Receiving ({receivingLocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receivingLocations.map(loc => (
                <div key={loc.id} className="text-sm p-2 bg-green-500/10 rounded">
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getWarehouseName(loc.warehouse_id)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Shipping ({shippingLocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shippingLocations.map(loc => (
                <div key={loc.id} className="text-sm p-2 bg-blue-500/10 rounded">
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getWarehouseName(loc.warehouse_id)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
