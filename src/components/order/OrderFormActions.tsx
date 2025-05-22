
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrderFormActionsProps {
  isSubmitting: boolean;
}

export const OrderFormActions = ({ isSubmitting }: OrderFormActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-end gap-3">
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => navigate("/orders")}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting} className="bg-tms-blue hover:bg-tms-blue-400">
        {isSubmitting ? <span className="flex items-center gap-2">Creating...</span> : (
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Create Order
          </span>
        )}
      </Button>
    </div>
  );
};
