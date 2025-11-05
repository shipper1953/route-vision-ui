import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PickList } from "@/hooks/usePicking";
import { Package, MapPin, Clock, Play } from "lucide-react";

interface PickListCardProps {
  pickList: PickList;
  onStart: (pickList: PickList) => void;
}

export const PickListCard = ({ pickList, onStart }: PickListCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalItems = pickList.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const pickedItems = pickList.items.reduce((sum, item) => sum + item.quantity_picked, 0);
  const progress = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Order #{pickList.order_number}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(pickList.created_at).toLocaleString()}
            </div>
          </div>
          
          <Badge className={getStatusColor(pickList.status)}>
            {pickList.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {pickedItems} of {totalItems} items picked
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">{pickList.items.length} unique items</div>
          <div className="flex flex-wrap gap-1">
            {pickList.items.slice(0, 3).map((item) => (
              <Badge key={item.id} variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {item.location_name}
              </Badge>
            ))}
            {pickList.items.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{pickList.items.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {pickList.status === 'pending' && (
          <Button
            onClick={() => onStart(pickList)}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Picking
          </Button>
        )}
      </div>
    </Card>
  );
};
