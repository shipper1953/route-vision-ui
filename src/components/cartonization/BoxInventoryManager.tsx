import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Package, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCartonization } from "@/hooks/useCartonization";
import { toast } from "sonner";

interface PackagingMasterItem {
  id: string;
  name: string;
  vendor_sku: string;
  type: string;
  length_in: number;
  width_in: number;
  height_in: number;
  weight_oz: number;
  cost: number;
  vendor: string;
}

export const BoxInventoryManager = () => {
  const { boxes, loading, updateBoxInventory } = useCartonization();
  const { userProfile } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<any>(null);
  const [masterList, setMasterList] = useState<PackagingMasterItem[]>([]);
  const [selectedMasterItem, setSelectedMasterItem] = useState<string>('');
  const [newBox, setNewBox] = useState({
    name: '',
    length: 0,
    width: 0,
    height: 0,
    max_weight: 50,
    cost: 0,
    in_stock: 0,
    min_stock: 10,
    max_stock: 100,
    box_type: 'box' as 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom',
    sku: '',
    description: ''
  });

  useEffect(() => {
    fetchMasterList();
  }, []);

  const fetchMasterList = async () => {
    try {
      const { data, error } = await supabase
        .from('packaging_master_list')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching master list:', error);
        return;
      }

      setMasterList(data || []);
    } catch (error) {
      console.error('Error fetching master list:', error);
    }
  };

  const handleMasterItemSelect = (masterItemId: string) => {
    setSelectedMasterItem(masterItemId);
    
    if (masterItemId === 'custom') {
      // Reset to custom entry
      setNewBox({
        name: '',
        length: 0,
        width: 0,
        height: 0,
        max_weight: 50,
        cost: 0,
        in_stock: 0,
        min_stock: 10,
        max_stock: 100,
        box_type: 'box',
        sku: '',
        description: ''
      });
      return;
    }

    const masterItem = masterList.find(item => item.id === masterItemId);
    if (masterItem) {
      setNewBox({
        name: masterItem.name,
        length: masterItem.length_in,
        width: masterItem.width_in,
        height: masterItem.height_in,
        max_weight: 50,
        cost: masterItem.cost,
        in_stock: 0,
        min_stock: 10,
        max_stock: 100,
        box_type: masterItem.type as any,
        sku: masterItem.vendor_sku,
        description: `${masterItem.vendor} ${masterItem.name}`
      });
    }
  };

  const handleAddBox = async () => {
    if (!newBox.name || !newBox.length || !newBox.width || !newBox.height) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!userProfile?.company_id) {
      toast.error('No company assigned to user');
      return;
    }

    try {
      const { error } = await supabase
        .from('boxes')
        .insert({
          company_id: userProfile.company_id,
          name: newBox.name,
          length: newBox.length,
          width: newBox.width,
          height: newBox.height,
          max_weight: newBox.max_weight || 50,
          cost: newBox.cost || 0,
          in_stock: newBox.in_stock || 0,
          min_stock: newBox.min_stock || 10,
          max_stock: newBox.max_stock || 100,
          box_type: newBox.box_type,
          sku: newBox.sku || null,
          description: newBox.description || null
        });

      if (error) {
        console.error('Error adding box:', error);
        toast.error('Failed to add box');
        return;
      }

      toast.success('Box added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      
      // Refresh boxes by reloading the page or triggering a refetch
      window.location.reload();
    } catch (error) {
      console.error('Error adding box:', error);
      toast.error('Failed to add box');
    }
  };

  const handleEditBox = async () => {
    if (!editingBox) return;

    try {
      const { error } = await supabase
        .from('boxes')
        .update({
          name: editingBox.name,
          length: editingBox.length,
          width: editingBox.width,
          height: editingBox.height,
          max_weight: editingBox.maxWeight,
          cost: editingBox.cost,
          in_stock: editingBox.inStock,
          min_stock: editingBox.minStock,
          max_stock: editingBox.maxStock,
          box_type: editingBox.type,
          sku: editingBox.sku || null,
          description: editingBox.description || null
        })
        .eq('id', editingBox.id);

      if (error) {
        console.error('Error updating box:', error);
        toast.error('Failed to update box');
        return;
      }

      toast.success('Box updated successfully');
      setEditingBox(null);
      
      // Refresh boxes
      window.location.reload();
    } catch (error) {
      console.error('Error updating box:', error);
      toast.error('Failed to update box');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this box?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('boxes')
        .delete()
        .eq('id', boxId);

      if (error) {
        console.error('Error deleting box:', error);
        toast.error('Failed to delete box');
        return;
      }

      toast.success('Box deleted successfully');
      
      // Refresh boxes
      window.location.reload();
    } catch (error) {
      console.error('Error deleting box:', error);
      toast.error('Failed to delete box');
    }
  };

  const resetForm = () => {
    setSelectedMasterItem('');
    setNewBox({
      name: '',
      length: 0,
      width: 0,
      height: 0,
      max_weight: 50,
      cost: 0,
      in_stock: 0,
      min_stock: 10,
      max_stock: 100,
      box_type: 'box',
      sku: '',
      description: ''
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading boxes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-tms-blue" />
            Box Inventory Management
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Box
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Box</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="masterSelect">Select from Master List (Optional)</Label>
                  <Select value={selectedMasterItem} onValueChange={handleMasterItemSelect}>
                    <SelectTrigger className="bg-accent/50">
                      <SelectValue placeholder="Choose from standard packaging or create custom" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="custom">📝 Custom Entry</SelectItem>
                      {masterList.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          📦 {item.name} ({item.vendor_sku}) - {item.length_in}"×{item.width_in}"×{item.height_in}" - ${item.cost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="boxName">Box Name</Label>
                  <Input
                    id="boxName"
                    value={newBox.name}
                    onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
                    placeholder="e.g., Small Box, Medium Poly Bag"
                  />
                </div>
                <div>
                  <Label htmlFor="boxType">Type</Label>
                  <Select value={newBox.box_type} onValueChange={(value) => setNewBox({ ...newBox, box_type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="poly_bag">Poly Bag</SelectItem>
                      <SelectItem value="envelope">Envelope</SelectItem>
                      <SelectItem value="tube">Tube</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inStock">In Stock</Label>
                  <Input
                    id="inStock"
                    type="number"
                    value={newBox.in_stock}
                    onChange={(e) => setNewBox({ ...newBox, in_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="minStock">Min Stock</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newBox.min_stock}
                    onChange={(e) => setNewBox({ ...newBox, min_stock: parseInt(e.target.value) || 0 })}
                    placeholder="Low inventory alert level"
                  />
                </div>
                <div>
                  <Label htmlFor="maxStock">Max Stock</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    value={newBox.max_stock}
                    onChange={(e) => setNewBox({ ...newBox, max_stock: parseInt(e.target.value) || 0 })}
                    placeholder="Reorder suggestion level"
                  />
                </div>
                <div>
                  <Label htmlFor="length">Length (in)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={newBox.length}
                    onChange={(e) => setNewBox({ ...newBox, length: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (in)</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={newBox.width}
                    onChange={(e) => setNewBox({ ...newBox, width: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (in)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={newBox.height}
                    onChange={(e) => setNewBox({ ...newBox, height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxWeight">Max Weight (lbs)</Label>
                  <Input
                    id="maxWeight"
                    type="number"
                    step="0.1"
                    value={newBox.max_weight}
                    onChange={(e) => setNewBox({ ...newBox, max_weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={newBox.cost}
                    onChange={(e) => setNewBox({ ...newBox, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="sku">SKU (Optional)</Label>
                  <Input
                    id="sku"
                    value={newBox.sku}
                    onChange={(e) => setNewBox({ ...newBox, sku: e.target.value })}
                    placeholder="e.g., BX-001"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={newBox.description}
                    onChange={(e) => setNewBox({ ...newBox, description: e.target.value })}
                    placeholder="Additional details about this box"
                  />
                </div>
              </div>
              <Button onClick={handleAddBox} className="w-full mt-4">
                Add Box
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {boxes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No boxes found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first box to the inventory.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Box
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box) => (
              <Card key={box.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{box.name}</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingBox(box)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBox(box.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Dimensions: {box.length}" × {box.width}" × {box.height}"</p>
                  <p>Max Weight: {box.maxWeight} lbs</p>
                  <p>Cost: ${box.cost.toFixed(2)}</p>
                  <p>Min Stock: {box.minStock} | Max Stock: {box.maxStock}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {box.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={box.inStock > 0 ? "default" : "destructive"}>
                    {box.inStock} in stock
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingBox} onOpenChange={(open) => !open && setEditingBox(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Box</DialogTitle>
            </DialogHeader>
            {editingBox && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="editBoxName">Box Name</Label>
                  <Input
                    id="editBoxName"
                    value={editingBox.name}
                    onChange={(e) => setEditingBox({ ...editingBox, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editInStock">In Stock</Label>
                  <Input
                    id="editInStock"
                    type="number"
                    value={editingBox.inStock}
                    onChange={(e) => setEditingBox({ ...editingBox, inStock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editMinStock">Min Stock</Label>
                  <Input
                    id="editMinStock"
                    type="number"
                    value={editingBox.minStock}
                    onChange={(e) => setEditingBox({ ...editingBox, minStock: parseInt(e.target.value) || 0 })}
                    placeholder="Low inventory alert"
                  />
                </div>
                <div>
                  <Label htmlFor="editMaxStock">Max Stock</Label>
                  <Input
                    id="editMaxStock"
                    type="number"
                    value={editingBox.maxStock}
                    onChange={(e) => setEditingBox({ ...editingBox, maxStock: parseInt(e.target.value) || 0 })}
                    placeholder="Reorder level"
                  />
                </div>
                <div>
                  <Label htmlFor="editCost">Cost ($)</Label>
                  <Input
                    id="editCost"
                    type="number"
                    step="0.01"
                    value={editingBox.cost}
                    onChange={(e) => setEditingBox({ ...editingBox, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editMaxWeight">Max Weight (lbs)</Label>
                  <Input
                    id="editMaxWeight"
                    type="number"
                    step="0.1"
                    value={editingBox.maxWeight}
                    onChange={(e) => setEditingBox({ ...editingBox, maxWeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
            <Button onClick={handleEditBox} className="w-full mt-4">
              Update Box
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};