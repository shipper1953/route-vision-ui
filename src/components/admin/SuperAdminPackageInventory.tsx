import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Package, Trash2, Loader2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  max_weight: number;
  cost: number;
  in_stock: number;
  box_type: 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom';
  sku: string | null;
  description: string | null;
  company_id: string;
  company?: {
    id: string;
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

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

export const SuperAdminPackageInventory = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
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
    box_type: 'box' as 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom',
    sku: '',
    description: '',
    company_id: ''
  });

  // Fetch companies and master list
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching companies:', error);
          return;
        }

        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

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

    fetchCompanies();
    fetchMasterList();
  }, []);

  // Fetch boxes based on selected company
  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('boxes')
          .select(`
            *,
            companies!inner(id, name)
          `)
          .eq('is_active', true)
          .order('name');

        if (selectedCompanyId && selectedCompanyId !== "all") {
          query = query.eq('company_id', selectedCompanyId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching boxes:', error);
          return;
        }

        if (data) {
          const transformedBoxes: Box[] = data.map(box => ({
            id: box.id,
            name: box.name,
            length: Number(box.length),
            width: Number(box.width),
            height: Number(box.height),
            max_weight: Number(box.max_weight),
            cost: Number(box.cost),
            in_stock: box.in_stock,
            box_type: box.box_type,
            sku: box.sku,
            description: box.description,
            company_id: box.company_id,
            company: box.companies
          }));

          setBoxes(transformedBoxes);
        }
      } catch (error) {
        console.error('Error fetching boxes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxes();
  }, [selectedCompanyId]);

  const handleMasterItemSelect = (masterItemId: string) => {
    setSelectedMasterItem(masterItemId);
    
    if (masterItemId === 'custom') {
      // Reset to custom entry, keeping the selected company
      setNewBox({
        name: '',
        length: 0,
        width: 0,
        height: 0,
        max_weight: 50,
        cost: 0,
        in_stock: 0,
        box_type: 'box',
        sku: '',
        description: '',
        company_id: newBox.company_id
      });
      return;
    }

    const masterItem = masterList.find(item => item.id === masterItemId);
    if (masterItem) {
      setNewBox({
        ...newBox,
        name: masterItem.name,
        length: masterItem.length_in,
        width: masterItem.width_in,
        height: masterItem.height_in,
        max_weight: 50,
        cost: masterItem.cost,
        box_type: masterItem.type as any,
        sku: masterItem.vendor_sku,
        description: `${masterItem.vendor} ${masterItem.name}`
      });
    }
  };

  const handleAddBox = async () => {
    if (!newBox.name || !newBox.length || !newBox.width || !newBox.height || !newBox.company_id) {
      toast.error('Please fill in all required fields including company selection');
      return;
    }

    try {
      const { error } = await supabase
        .from('boxes')
        .insert({
          company_id: newBox.company_id,
          name: newBox.name,
          length: newBox.length,
          width: newBox.width,
          height: newBox.height,
          max_weight: newBox.max_weight || 50,
          cost: newBox.cost || 0,
          in_stock: newBox.in_stock || 0,
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
      
      // Refresh boxes
      const event = new Event('refresh-boxes');
      window.dispatchEvent(event);
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
          max_weight: editingBox.max_weight,
          cost: editingBox.cost,
          in_stock: editingBox.in_stock,
          box_type: editingBox.box_type,
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
      box_type: 'box',
      sku: '',
      description: '',
      company_id: ''
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading package inventory...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Package Inventory Management
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Package</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="companySelect">Company *</Label>
                  <Select value={newBox.company_id} onValueChange={(value) => setNewBox({ ...newBox, company_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company for this package" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="packageName">Package Name *</Label>
                  <Input
                    id="packageName"
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
                    <SelectContent className="bg-background border-border z-50">
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
                  <Label htmlFor="length">Length (in) *</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={newBox.length}
                    onChange={(e) => setNewBox({ ...newBox, length: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (in) *</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={newBox.width}
                    onChange={(e) => setNewBox({ ...newBox, width: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (in) *</Label>
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
                    placeholder="Additional details about this package"
                  />
                </div>
              </div>
              <Button onClick={handleAddBox} className="w-full mt-4">
                Add Package
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Company Filter */}
        <div className="mb-6">
          <Label htmlFor="companyFilter" className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4" />
            Filter by Company
          </Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="all">All companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {boxes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No packages found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedCompanyId && selectedCompanyId !== "all"
                ? "No packages found for the selected company." 
                : "Get started by adding packages to company inventories."
              }
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box) => (
              <Card key={box.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{box.name}</h4>
                    <p className="text-sm text-muted-foreground">{box.company?.name}</p>
                  </div>
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
                  <p>Max Weight: {box.max_weight} lbs</p>
                  <p>Cost: ${box.cost.toFixed(2)}</p>
                  {box.sku && <p>SKU: {box.sku}</p>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {box.box_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={box.in_stock > 0 ? "default" : "destructive"}>
                    {box.in_stock} in stock
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingBox} onOpenChange={(open) => !open && setEditingBox(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
            </DialogHeader>
            {editingBox && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="editBoxName">Package Name</Label>
                  <Input
                    id="editBoxName"
                    value={editingBox.name}
                    onChange={(e) => setEditingBox({ ...editingBox, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editBoxType">Type</Label>
                  <Select value={editingBox.box_type} onValueChange={(value) => setEditingBox({ ...editingBox, box_type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="poly_bag">Poly Bag</SelectItem>
                      <SelectItem value="envelope">Envelope</SelectItem>
                      <SelectItem value="tube">Tube</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editInStock">In Stock</Label>
                  <Input
                    id="editInStock"
                    type="number"
                    value={editingBox.in_stock}
                    onChange={(e) => setEditingBox({ ...editingBox, in_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editLength">Length (in)</Label>
                  <Input
                    id="editLength"
                    type="number"
                    step="0.1"
                    value={editingBox.length}
                    onChange={(e) => setEditingBox({ ...editingBox, length: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editWidth">Width (in)</Label>
                  <Input
                    id="editWidth"
                    type="number"
                    step="0.1"
                    value={editingBox.width}
                    onChange={(e) => setEditingBox({ ...editingBox, width: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editHeight">Height (in)</Label>
                  <Input
                    id="editHeight"
                    type="number"
                    step="0.1"
                    value={editingBox.height}
                    onChange={(e) => setEditingBox({ ...editingBox, height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editMaxWeight">Max Weight (lbs)</Label>
                  <Input
                    id="editMaxWeight"
                    type="number"
                    step="0.1"
                    value={editingBox.max_weight}
                    onChange={(e) => setEditingBox({ ...editingBox, max_weight: parseFloat(e.target.value) || 0 })}
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
                <div className="col-span-2">
                  <Label htmlFor="editSku">SKU (Optional)</Label>
                  <Input
                    id="editSku"
                    value={editingBox.sku || ''}
                    onChange={(e) => setEditingBox({ ...editingBox, sku: e.target.value })}
                    placeholder="e.g., BX-001"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="editDescription">Description (Optional)</Label>
                  <Input
                    id="editDescription"
                    value={editingBox.description || ''}
                    onChange={(e) => setEditingBox({ ...editingBox, description: e.target.value })}
                    placeholder="Additional details about this package"
                  />
                </div>
              </div>
            )}
            <Button onClick={handleEditBox} className="w-full mt-4">
              Update Package
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
