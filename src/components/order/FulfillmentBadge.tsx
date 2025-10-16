import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FulfillmentBadgeProps {
  itemsShipped: number;
  itemsTotal: number;
  fulfillmentPercentage: number;
  status: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled';
  showProgress?: boolean;
}

export const FulfillmentBadge = ({
  itemsShipped,
  itemsTotal,
  fulfillmentPercentage,
  status,
  showProgress = false
}: FulfillmentBadgeProps) => {
  const getVariant = () => {
    if (status === 'unfulfilled') return 'destructive';
    if (status === 'partially_fulfilled') return 'warning';
    return 'default';
  };

  const getLabel = () => {
    return `${itemsShipped}/${itemsTotal} items (${Math.round(fulfillmentPercentage)}%)`;
  };

  if (showProgress) {
    return (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <div className="text-xs text-muted-foreground">
          {itemsShipped} of {itemsTotal} items
        </div>
        <Progress value={fulfillmentPercentage} className="h-2" />
        <div className="text-xs text-muted-foreground text-right">
          {Math.round(fulfillmentPercentage)}%
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={getVariant() as any}>
            {getLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-semibold mb-1">Fulfillment Status</div>
            <div>Items Shipped: {itemsShipped}</div>
            <div>Items Total: {itemsTotal}</div>
            <div>Percentage: {fulfillmentPercentage.toFixed(2)}%</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
