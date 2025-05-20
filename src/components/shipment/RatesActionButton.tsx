
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowRight } from "lucide-react";

interface RatesActionButtonProps {
  loading: boolean;
}

export const RatesActionButton = ({ loading }: RatesActionButtonProps) => {
  return (
    <Button 
      type="submit" 
      className="bg-tms-blue hover:bg-tms-blue-400"
      disabled={loading}
    >
      {loading ? (
        <>
          <LoadingSpinner size={16} className="mr-2" /> 
          Getting Rates...
        </>
      ) : (
        <>
          Get Shipping Rates
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
};
