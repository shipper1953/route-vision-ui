
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditItemDialog } from "./EditItemDialog";
import { Item } from "@/types/itemMaster";

interface ItemMasterTableProps {
  items: Item[];
  loading: boolean;
  onUpdate: (item: Item) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ItemMasterTable = ({ items, loading, onUpdate, onDelete }: ItemMasterTableProps) => {
  const [editingItem, setEditingItem] = useState<Item | null>(null);

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
    if (weight > 50) return "bg-red-100 text-red-800";
    if (weight > 20) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Dimensions (L×W×H)</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
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
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
    </>
  );
};
