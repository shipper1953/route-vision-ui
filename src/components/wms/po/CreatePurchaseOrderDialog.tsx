import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomers } from "@/hooks/useCustomers";
import { useItemMaster } from "@/hooks/useItemMaster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { PurchaseOrderLineItem } from "@/hooks/usePurchaseOrders";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (poData: any, lineItems: PurchaseOrderLineItem[]) => Promise<any>;
}

export const CreatePurchaseOrderDialog = ({ open, onOpenChange, onSubmit }: CreatePurchaseOrderDialogProps) => {
  const { userProfile } = useAuth();
  const { customers } = useCustomers();
  const { items } = useItemMaster();
  const [formData, setFormData] = useState({
    po_number: "",
    customer_id: "",
    warehouse_id: userProfile?.warehouse_ids?.[0] || "",
    vendor_name: "",
    vendor_contact: "",
    expected_date: "",
    notes: ""
  });
  const [lineItems, setLineItems] = useState<PurchaseOrderLineItem[]>([
    { item_id: "", uom: "each", quantity_ordered: 1, unit_cost: 0, line_number: 1 }
  ]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { item_id: "", uom: "each", quantity_ordered: 1, unit_cost: 0, line_number: lineItems.length + 1 }
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await onSubmit({
      ...formData,
      company_id: userProfile?.company_id,
      status: 'pending'
    }, lineItems);

    if (result) {
      setFormData({
        po_number: "",
        customer_id: "",
        warehouse_id: userProfile?.warehouse_ids?.[0] || "",
        vendor_name: "",
        vendor_contact: "",
        expected_date: "",
        notes: ""
      });
      setLineItems([{ item_id: "", uom: "each", quantity_ordered: 1, unit_cost: 0, line_number: 1 }]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new inbound purchase order
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="po_number">PO Number *</Label>
                <Input
                  id="po_number"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  placeholder="PO-2025-001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor_contact">Vendor Contact</Label>
                <Input
                  id="vendor_contact"
                  value={formData.vendor_contact}
                  onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expected_date">Expected Delivery Date</Label>
              <Input
                id="expected_date"
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Line Items */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((lineItem, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                    <div className="col-span-4">
                      <Label>Item</Label>
                      <Select
                        value={lineItem.item_id}
                        onValueChange={(value) => updateLineItem(index, 'item_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>UOM</Label>
                      <Select
                        value={lineItem.uom}
                        onValueChange={(value) => updateLineItem(index, 'uom', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="innerpack">Innerpack</SelectItem>
                          <SelectItem value="case">Case</SelectItem>
                          <SelectItem value="pallet">Pallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={lineItem.quantity_ordered}
                        onChange={(e) => updateLineItem(index, 'quantity_ordered', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lineItem.unit_cost}
                        onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create PO</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
