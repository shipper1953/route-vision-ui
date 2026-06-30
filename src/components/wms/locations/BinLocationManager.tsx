import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWarehouseLocations, WarehouseLocation, BinLocationType } from "@/hooks/useWarehouseLocations";
import { useBinTransfers, BinTransfer } from "@/hooks/useBinTransfers";
import { usePutawayTasks, PutawayTask } from "@/hooks/usePutawayTasks";
import { useWarehouses } from "@/hooks/useWarehouses";
import { ArrowRight, Boxes, ClipboardCheck, PackageCheck, PackagePlus, Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";

const BIN_TYPES: Array<{
  value: BinLocationType;
  label: string;
  description: string;
  className: string;
}> = [
  {
    value: "inbound",
    label: "Inbound",
    description: "Accepts received inventory awaiting putaway.",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  {
    value: "picking",
    label: "Picking",
    description: "Pickable inventory used to fulfill customer orders.",
    className: "bg-blue-500/10 text-blue-700 border-blue-200",
  },
  {
    value: "storage",
    label: "Storage",
    description: "Putaway reserve for replenishment and warehouse transfers only.",
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  {
    value: "outbound",
    label: "Outbound",
    description: "Order picks staged before pack and ship.",
    className: "bg-purple-500/10 text-purple-700 border-purple-200",
  },
];

const binTypeMeta = (type: string) => BIN_TYPES.find((binType) => binType.value === type) || BIN_TYPES[2];
const isPutawayDestination = (location: WarehouseLocation) => ["storage", "picking"].includes(location.location_type);

export const BinLocationManager = () => {
  const { locations, loading: locationsLoading, createLocation, fetchLocations } = useWarehouseLocations();
  const { loading: transferLoading, transferBin } = useBinTransfers();
  const { warehouses, loading: warehousesLoading } = useWarehouses();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedPutawayTaskId, setSelectedPutawayTaskId] = useState<string>("");
  const [putawayDestination, setPutawayDestination] = useState<string>("");
  const [putawayQuantity, setPutawayQuantity] = useState<number>(1);
  const { tasks: putawayTasks, loading: putawayLoading, startPutawayTask, completePutawayTask } = usePutawayTasks(selectedWarehouse);

  const [newLocation, setNewLocation] = useState({
    warehouse_id: undefined as string | undefined,
    name: "",
    zone: "",
    aisle: "",
    rack: "",
    shelf: "",
    bin: "",
    location_type: "storage" as BinLocationType,
    is_active: true,
  });

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      const defaultWarehouse = warehouses.find((w) => w.is_default) || warehouses[0];
      setSelectedWarehouse(defaultWarehouse.id);
      setNewLocation((prev) => ({ ...prev, warehouse_id: defaultWarehouse.id }));
    }
  }, [warehouses, selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse);
      setNewLocation((prev) => ({ ...prev, warehouse_id: selectedWarehouse }));
    }
  }, [selectedWarehouse]);

  const [transfer, setTransfer] = useState<Partial<BinTransfer>>({
    from_location_id: "",
    to_location_id: "",
    quantity: 1,
    reason: "relocation",
  });

  const groupedLocations = useMemo(
    () => BIN_TYPES.map((type) => ({ ...type, locations: locations.filter((location) => location.location_type === type.value) })),
    [locations]
  );
  const inboundLocations = locations.filter((location) => location.location_type === "inbound");
  const putawayDestinations = locations.filter(isPutawayDestination);
  const outboundLocations = locations.filter((location) => location.location_type === "outbound");
  const selectedPutawayTask = putawayTasks.find((task) => task.id === selectedPutawayTaskId);

  const handleCreateLocation = async () => {
    if (!newLocation.warehouse_id) {
      toast.error("Please select a warehouse");
      return;
    }

    try {
      await createLocation(newLocation as any);
      setShowCreate(false);
      setNewLocation({
        warehouse_id: selectedWarehouse,
        name: "",
        zone: "",
        aisle: "",
        rack: "",
        shelf: "",
        bin: "",
        location_type: "storage",
        is_active: true,
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTransfer = async () => {
    if (!transfer.item_id || !transfer.from_location_id || !transfer.to_location_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    const fromLocation = locations.find((location) => location.id === transfer.from_location_id);
    const toLocation = locations.find((location) => location.id === transfer.to_location_id);
    if (fromLocation?.location_type === "storage" && toLocation?.location_type !== "picking") {
      toast.error("Storage bins can only replenish picking bins or support warehouse transfers");
      return;
    }

    try {
      await transferBin(transfer as BinTransfer);
      setShowTransfer(false);
      setTransfer({ from_location_id: "", to_location_id: "", quantity: 1, reason: "relocation" });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCompletePutaway = async () => {
    if (!selectedPutawayTask) {
      toast.error("Select a putaway task");
      return;
    }

    await completePutawayTask(selectedPutawayTask, putawayDestination, putawayQuantity);
    setSelectedPutawayTaskId("");
    setPutawayDestination("");
    setPutawayQuantity(1);
  };

  const getWarehouseName = (warehouseId: string) => warehouses.find((w) => w.id === warehouseId)?.name || "Unknown";
  const renderLocationCard = (location: WarehouseLocation) => {
    const meta = binTypeMeta(location.location_type);
    return (
      <div key={location.id} className="rounded border bg-card p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{location.name}</div>
            <div className="text-xs text-muted-foreground">{getWarehouseName(location.warehouse_id)}</div>
          </div>
          <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {[location.zone && `Zone ${location.zone}`, location.aisle && `Aisle ${location.aisle}`, location.rack && `Rack ${location.rack}`, location.shelf && `Shelf ${location.shelf}`]
            .filter(Boolean)
            .join(" • ") || "No slot details"}
        </div>
      </div>
    );
  };

  const renderTaskOption = (task: PutawayTask) => (
    <SelectItem key={task.id} value={task.id}>
      {task.items?.sku || task.item_id} • {task.quantity_to_putaway - task.quantity_put_away} units
    </SelectItem>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bin Management & Putaway</h2>
          <p className="text-sm text-muted-foreground">Configure bin capabilities, move inventory, and direct received goods into picking or reserve storage.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTransfer(!showTransfer)} variant="outline"><ArrowRight className="mr-2 h-4 w-4" />Transfer Bin</Button>
          <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" />Create Bin</Button>
        </div>
      </div>

      {warehousesLoading ? (
        <Card><CardContent className="pt-6"><p className="text-muted-foreground">Loading warehouses...</p></CardContent></Card>
      ) : warehouses.length === 0 ? (
        <Card><CardContent className="pt-6"><p className="text-muted-foreground">No warehouses found. Please create a warehouse first.</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="flex min-w-fit items-center gap-2"><Warehouse className="h-4 w-4" />Warehouse:</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map((wh) => <SelectItem key={wh.id} value={wh.id}>{wh.name}{wh.is_default && " (Default)"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {BIN_TYPES.map((type) => {
          const count = locations.filter((location) => location.location_type === type.value).length;
          return (
            <Card key={type.value}>
              <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-base"><span>{type.label}</span><Badge variant="outline" className={type.className}>{count}</Badge></CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{type.description}</p></CardContent>
            </Card>
          );
        })}
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create New Bin</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Warehouse *</Label><Select value={newLocation.warehouse_id} onValueChange={(value) => setNewLocation({ ...newLocation, warehouse_id: value })}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((wh) => <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Bin Name *</Label><Input value={newLocation.name} onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })} placeholder="A-01-01-A" /></div>
              <div className="space-y-2"><Label>Bin Type *</Label><Select value={newLocation.location_type} onValueChange={(value: BinLocationType) => setNewLocation({ ...newLocation, location_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BIN_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Zone</Label><Input value={newLocation.zone} onChange={(e) => setNewLocation({ ...newLocation, zone: e.target.value })} placeholder="A" /></div>
              <div className="space-y-2"><Label>Aisle</Label><Input value={newLocation.aisle} onChange={(e) => setNewLocation({ ...newLocation, aisle: e.target.value })} placeholder="01" /></div>
              <div className="space-y-2"><Label>Rack</Label><Input value={newLocation.rack} onChange={(e) => setNewLocation({ ...newLocation, rack: e.target.value })} placeholder="01" /></div>
              <div className="space-y-2"><Label>Shelf</Label><Input value={newLocation.shelf} onChange={(e) => setNewLocation({ ...newLocation, shelf: e.target.value })} placeholder="A" /></div>
            </div>
            <div className="rounded bg-muted p-3 text-sm text-muted-foreground">{binTypeMeta(newLocation.location_type).description}</div>
            <div className="flex gap-2"><Button onClick={handleCreateLocation} disabled={locationsLoading || !newLocation.name || !newLocation.warehouse_id}>Create Bin</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      {showTransfer && (
        <Card>
          <CardHeader><CardTitle>Transfer Bin Inventory</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Item ID *</Label><Input value={transfer.item_id || ""} onChange={(e) => setTransfer({ ...transfer, item_id: e.target.value })} placeholder="Item UUID" /></div>
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={transfer.quantity} onChange={(e) => setTransfer({ ...transfer, quantity: parseInt(e.target.value) || 1 })} min="1" /></div>
              <div className="space-y-2"><Label>From Bin *</Label><Select value={transfer.from_location_id} onValueChange={(value) => setTransfer({ ...transfer, from_location_id: value })}><SelectTrigger><SelectValue placeholder="Select bin" /></SelectTrigger><SelectContent>{locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name} ({binTypeMeta(loc.location_type).label})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>To Bin *</Label><Select value={transfer.to_location_id} onValueChange={(value) => setTransfer({ ...transfer, to_location_id: value })}><SelectTrigger><SelectValue placeholder="Select bin" /></SelectTrigger><SelectContent>{locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name} ({binTypeMeta(loc.location_type).label})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Reason *</Label><Select value={transfer.reason} onValueChange={(value) => setTransfer({ ...transfer, reason: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="relocation">Relocation</SelectItem><SelectItem value="consolidation">Consolidation</SelectItem><SelectItem value="replenishment">Replenishment</SelectItem><SelectItem value="warehouse_transfer">Warehouse Transfer</SelectItem><SelectItem value="correction">Correction</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex gap-2"><Button onClick={handleTransfer} disabled={transferLoading}>Transfer</Button><Button variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="putaway">
        <TabsList><TabsTrigger value="putaway">Putaway Queue</TabsTrigger><TabsTrigger value="bins">Bin Directory</TabsTrigger></TabsList>
        <TabsContent value="putaway" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackagePlus className="h-4 w-4" />Inbound Bins</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{inboundLocations.length}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" />Open Putaways</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{putawayTasks.filter((task) => task.status !== "completed").length}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4" />Outbound Staging</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{outboundLocations.length}</CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Complete Putaway</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Task</Label><Select value={selectedPutawayTaskId} onValueChange={(value) => { const task = putawayTasks.find((candidate) => candidate.id === value); setSelectedPutawayTaskId(value); setPutawayQuantity(task ? task.quantity_to_putaway - task.quantity_put_away : 1); }}><SelectTrigger><SelectValue placeholder="Select open task" /></SelectTrigger><SelectContent>{putawayTasks.filter((task) => task.status !== "completed").map(renderTaskOption)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Destination Bin</Label><Select value={putawayDestination} onValueChange={setPutawayDestination}><SelectTrigger><SelectValue placeholder="Select storage or picking bin" /></SelectTrigger><SelectContent>{putawayDestinations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name} ({binTypeMeta(loc.location_type).label})</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={putawayQuantity} onChange={(event) => setPutawayQuantity(parseInt(event.target.value) || 1)} /></div>
              </div>
              {selectedPutawayTask && <div className="rounded bg-muted p-3 text-sm text-muted-foreground">Move {selectedPutawayTask.items?.name || selectedPutawayTask.item_id} from {selectedPutawayTask.from_location?.name || "inbound receiving"} into a putaway-eligible picking or storage bin.</div>}
              <div className="flex gap-2"><Button disabled={putawayLoading || !selectedPutawayTaskId || !putawayDestination} onClick={handleCompletePutaway}>Complete Putaway</Button>{selectedPutawayTask && selectedPutawayTask.status === "pending" && <Button variant="outline" onClick={() => startPutawayTask(selectedPutawayTask.id)}>Start Task</Button>}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Putaway Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {putawayTasks.length === 0 ? <p className="text-sm text-muted-foreground">No putaway tasks found.</p> : putawayTasks.slice(0, 12).map((task) => <div key={task.id} className="flex items-center justify-between rounded border p-3 text-sm"><div><div className="font-medium">{task.items?.sku || task.item_id} {task.items?.name && `• ${task.items.name}`}</div><div className="text-muted-foreground">{task.from_location?.name || "Inbound"} → {task.to_location?.name || "Unassigned"} • {task.quantity_put_away}/{task.quantity_to_putaway}</div></div><Badge variant={task.status === "completed" ? "default" : "outline"}>{task.status}</Badge></div>)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bins" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {groupedLocations.map((group) => <Card key={group.value}><CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />{group.label} Bins ({group.locations.length})</CardTitle></CardHeader><CardContent className="space-y-2">{group.locations.length === 0 ? <p className="text-sm text-muted-foreground">No {group.label.toLowerCase()} bins configured.</p> : group.locations.slice(0, 10).map(renderLocationCard)}</CardContent></Card>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
