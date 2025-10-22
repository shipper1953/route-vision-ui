
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowRight } from "lucide-react";

interface RatesActionButtonProps {
  loading: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const RatesActionButton = ({ loading, onClick, disabled, children }: RatesActionButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const isDisabled = loading || disabled;

  return (
    <Button 
      type="submit" 
      className={loading ? "bg-transparent hover:bg-transparent border-transparent" : "bg-tms-blue hover:bg-tms-blue-400"}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {loading ? (
        <LoadingSpinner size={200} className="[&>span]:hidden [&>div]:bg-transparent tornado-360-spin" />
      ) : (
        <>
          {children || "Get Shipping Rates"}
          {!children && <ArrowRight className="ml-2 h-4 w-4" />}
        </>
      )}
    </Button>
  );
};
