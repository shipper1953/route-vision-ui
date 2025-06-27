
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

interface OrderTableHeaderProps {
  onToggleFilters: () => void;
}

export const OrderTableHeader = ({ onToggleFilters }: OrderTableHeaderProps) => {
  return (
    <CardTitle className="flex items-center justify-between">
      <span>Orders</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </CardTitle>
  );
};
