
import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Package, Ruler } from "lucide-react";
import { OrderFormValues } from "@/types/order";
import { useItemMaster } from "@/hooks/useItemMaster";
import { Badge } from "@/components/ui/badge";

export const OrderItemsSection = () => {
  const form = useFormContext<OrderFormValues>();
  const { items } = useItemMaster();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems"
  });

  const addItem = () => {
    append({
      itemId: "",
      quantity: 1,
      unitPrice: 0
    });
  };

  const getItemDetails = (itemId: string) => {
    return items.find(item => item.id === itemId);
  };

  const calculateTotalValue = () => {
    return fields.reduce((total, field, index) => {
      const quantity = form.watch(`orderItems.${index}.quantity`) || 0;
      const unitPrice = form.watch(`orderItems.${index}.unitPrice`) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
            <CardDescription>Select items from your catalog</CardDescription>
          </div>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items added yet. Click "Add Item" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedItem = getItemDetails(form.watch(`orderItems.${index}.itemId`));
              
              return (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Item #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`orderItems.${index}.itemId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items
                                .filter(item => item.isActive)
                                .map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        SKU: {item.sku} | {item.category}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`orderItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`orderItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {selectedItem && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Item Details</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Dimensions:</span>
                          <div>{selectedItem.length}" × {selectedItem.width}" × {selectedItem.height}"</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight:</span>
                          <Badge variant="outline">{selectedItem.weight} lbs</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SKU:</span>
                          <div className="font-mono">{selectedItem.sku}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <Badge variant="secondary">{selectedItem.category}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Order Value:</span>
                <span className="text-lg font-bold text-tms-blue">
                  ${calculateTotalValue().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
