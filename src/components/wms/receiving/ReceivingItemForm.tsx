import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, CheckCircle } from "lucide-react";

interface ReceivingItemFormProps {
  item: any;
  poLineItem: any;
  onReceive: (data: {
    uom: string;
    quantity: number;
    lotNumber?: string;
    serialNumbers?: string[];
    condition: string;
  }) => void;
  onCancel: () => void;
}

export const ReceivingItemForm = ({ item, poLineItem, onReceive, onCancel }: ReceivingItemFormProps) => {
  const [uom, setUom] = useState(poLineItem?.uom || 'each');
  const [quantity, setQuantity] = useState(1);
  const [lotNumber, setLotNumber] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [condition, setCondition] = useState<string>("good");

  const handleSubmit = () => {
    onReceive({
      uom,
      quantity,
      lotNumber: lotNumber || undefined,
      serialNumbers: serialNumbers ? serialNumbers.split(',').map(s => s.trim()) : undefined,
      condition
    });
  };

  const incrementQty = () => setQuantity(q => q + 1);
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="border-b pb-3">
        <h3 className="font-semibold text-lg">{item?.name}</h3>
        <p className="text-sm text-muted-foreground">SKU: {item?.sku}</p>
        <p className="text-sm text-muted-foreground">
          Ordered: {poLineItem?.quantity_ordered} {poLineItem?.uom} | 
          Received: {poLineItem?.quantity_received || 0}
        </p>
      </div>

      {/* UOM Selector */}
      <div className="space-y-2">
        <Label htmlFor="uom">Unit of Measure</Label>
        <Select value={uom} onValueChange={setUom}>
          <SelectTrigger id="uom" className="h-12">
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

      {/* Quantity with +/- buttons */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity Received</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrementQty}
            className="h-12 w-12"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="h-12 text-center text-lg font-semibold"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={incrementQty}
            className="h-12 w-12"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lot Number */}
      <div className="space-y-2">
        <Label htmlFor="lot">Lot Number (Optional)</Label>
        <Input
          id="lot"
          type="text"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
          placeholder="Enter lot number"
          className="h-12"
        />
      </div>

      {/* Serial Numbers */}
      <div className="space-y-2">
        <Label htmlFor="serials">Serial Numbers (Optional)</Label>
        <Input
          id="serials"
          type="text"
          value={serialNumbers}
          onChange={(e) => setSerialNumbers(e.target.value)}
          placeholder="Comma-separated serial numbers"
          className="h-12"
        />
        <p className="text-xs text-muted-foreground">
          Enter multiple serial numbers separated by commas
        </p>
      </div>

      {/* Condition Selector */}
      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger id="condition" className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-12">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 h-12">
          <CheckCircle className="mr-2 h-4 w-4" />
          Receive Item
        </Button>
      </div>
    </div>
  );
};
