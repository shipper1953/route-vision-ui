import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Package, Printer } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditItemDialog } from "./EditItemDialog";
import { BarcodePrintDialog } from "./BarcodePrintDialog";
import { Item } from "@/types/itemMaster";
import { formatDistanceToNow } from "date-fns";

interface ItemMasterTableProps {
  items: Item[];
  loading: boolean;
  onUpdate: (item: Item) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ItemMasterTable = ({ items, loading, onUpdate, onDelete }: ItemMasterTableProps) => {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printItems, setPrintItems] = useState<Item[]>([]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size={24} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-muted-foreground">No items found. Add your first item to get started.</p>
      </div>
    );
  }

  const formatDimensions = (item: Item) => {
    return `${item.length}" × ${item.width}" × ${item.height}"`;
  };

  const getWeightColor = (weight: number) => {
    if (weight > 50) return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100";
    if (weight > 20) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-100";
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handlePrintSelected = () => {
    const itemsToPrint = items.filter(item => selectedItems.has(item.id));
    setPrintItems(itemsToPrint);
    setPrintDialogOpen(true);
  };

  const handlePrintSingle = (item: Item) => {
    setPrintItems([item]);
    setPrintDialogOpen(true);
  };

  const allSelected = items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;

  return (
    <>
      {selectedItems.size > 0 && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </span>
          <Button onClick={handlePrintSelected} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Barcodes
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Dimensions (L×W×H)</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Shopify Variant</TableHead>
            <TableHead>Dims Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                  aria-label={`Select ${item.name}`}
                />
              </TableCell>
              <TableCell className="font-mono">{item.sku}</TableCell>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell>{formatDimensions(item)}</TableCell>
              <TableCell>
                <Badge className={getWeightColor(item.weight)}>
                  {item.weight} lbs
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.category}</Badge>
              </TableCell>
              <TableCell>
                {item.shopifyVariantGid ? (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block" title={item.shopifyVariantGid}>
                    {item.shopifyVariantGid.split('/').pop()}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {item.dimensionsUpdatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.dimensionsUpdatedAt), { addSuffix: true })}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Never</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrintSingle(item)}
                    title="Print barcode"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditItemDialog
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={onUpdate}
      />

      <BarcodePrintDialog
        items={printItems}
        isOpen={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
          setPrintItems([]);
        }}
      />
    </>
  );
};
