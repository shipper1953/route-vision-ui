
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowRight } from "lucide-react";

interface RatesActionButtonProps {
  loading: boolean;
  onClick?: () => void; // Add an optional onClick handler
}

export const RatesActionButton = ({ loading, onClick }: RatesActionButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault(); // Prevent default if we have a custom handler
      onClick();
    }
  };

  return (
    <Button 
      type="submit" 
      className={loading ? "bg-transparent hover:bg-transparent border-transparent" : "bg-tms-blue hover:bg-tms-blue-400"}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? (
        <LoadingSpinner size={16} className="[&>span]:hidden [&>div]:bg-transparent" />
      ) : (
        <>
          Get Shipping Rates
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
};
