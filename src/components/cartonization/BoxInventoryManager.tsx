
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Package, Trash2 } from "lucide-react";
import { Box } from "@/services/cartonization/cartonizationEngine";
import { toast } from "sonner";

interface BoxInventoryManagerProps {
  boxes: Box[];
  onBoxesChange: (boxes: Box[]) => void;
}

export const BoxInventoryManager = ({ boxes, onBoxesChange }: BoxInventoryManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [newBox, setNewBox] = useState<Partial<Box>>({
    name: '',
    length: 0,
    width: 0,
    height: 0,
    maxWeight: 0,
    cost: 0,
    inStock: 0,
    type: 'box'
  });

  const handleAddBox = () => {
    if (!newBox.name || !newBox.length || !newBox.width || !newBox.height) {
      toast.error('Please fill in all required fields');
      return;
    }

    const box: Box = {
      id: Date.now().toString(),
      name: newBox.name,
      length: newBox.length || 0,
      width: newBox.width || 0,
      height: newBox.height || 0,
      maxWeight: newBox.maxWeight || 50,
      cost: newBox.cost || 0,
      inStock: newBox.inStock || 0,
      type: newBox.type as 'box' | 'poly_bag'
    };

    onBoxesChange([...boxes, box]);
    setNewBox({
      name: '',
      length: 0,
      width: 0,
      height: 0,
      maxWeight: 0,
      cost: 0,
      inStock: 0,
      type: 'box'
    });
    setIsAddDialogOpen(false);
    toast.success('Box added successfully');
  };

  const handleUpdateBox = () => {
    if (!editingBox) return;

    const updatedBoxes = boxes.map(box => 
      box.id === editingBox.id ? editingBox : box
    );
    onBoxesChange(updatedBoxes);
    setEditingBox(null);
    toast.success('Box updated successfully');
  };

  const handleDeleteBox = (boxId: string) => {
    const updatedBoxes = boxes.filter(box => box.id !== boxId);
    onBoxesChange(updatedBoxes);
    toast.success('Box deleted successfully');
  };

  const resetForm = () => {
    setNewBox({
      name: '',
      length: 0,
      width: 0,
      height: 0,
      maxWeight: 0,
      cost: 0,
      inStock: 0,
      type: 'box'
    });
  };

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
                  <Select value={newBox.type} onValueChange={(value: 'box' | 'poly_bag') => setNewBox({ ...newBox, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="poly_bag">Poly Bag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inStock">In Stock</Label>
                  <Input
                    id="inStock"
                    type="number"
                    value={newBox.inStock}
                    onChange={(e) => setNewBox({ ...newBox, inStock: parseInt(e.target.value) || 0 })}
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
                    value={newBox.maxWeight}
                    onChange={(e) => setNewBox({ ...newBox, maxWeight: parseFloat(e.target.value) || 0 })}
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
              </div>
              <Button onClick={handleAddBox} className="w-full mt-4">
                Add Box
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
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
                  <Label htmlFor="editCost">Cost ($)</Label>
                  <Input
                    id="editCost"
                    type="number"
                    step="0.01"
                    value={editingBox.cost}
                    onChange={(e) => setEditingBox({ ...editingBox, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
            <Button onClick={handleUpdateBox} className="w-full mt-4">
              Update Box
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
