
import { BoxInventoryManager } from "@/components/cartonization/BoxInventoryManager";
import { useCartonization } from "@/hooks/useCartonization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export const CartonizationSettings = () => {
  const { boxes, setBoxes } = useCartonization();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-tms-blue" />
            Cartonization Settings
          </CardTitle>
          <CardDescription>
            Manage your packaging inventory and cartonization preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Configure your available boxes and poly bags to get optimal packaging recommendations 
            during shipment creation. The cartonization engine will suggest the most cost-effective 
            and space-efficient packaging based on your inventory.
          </p>
        </CardContent>
      </Card>
      
      <BoxInventoryManager 
        boxes={boxes} 
        onBoxesChange={setBoxes} 
      />
    </div>
  );
};
