
import { Navigation } from "lucide-react";
import { Address } from "@/types/easypost";

interface AddressResultsListProps {
  results: Address[];
  onSelectAddress: (address: Address) => void;
  isLoading: boolean;
  searchError: string | null;
  searchQuery: string;
}

export const AddressResultsList = ({
  results,
  onSelectAddress,
  isLoading,
  searchError,
  searchQuery
}: AddressResultsListProps) => {
  return (
    <>
      {searchError && (
        <p className="text-sm text-destructive text-center">{searchError}</p>
      )}
      
      {results.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((address, index) => (
            <div 
              key={index}
              className="p-2 hover:bg-muted rounded cursor-pointer flex items-start gap-2"
              onClick={() => onSelectAddress(address)}
            >
              <Navigation className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{address.street1}</p>
                {address.street2 && <p className="text-sm">{address.street2}</p>}
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.state} {address.zip}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        searchQuery.length >= 3 && !isLoading && !searchError && (
          <p className="text-sm text-muted-foreground text-center py-2">No results found</p>
        )
      )}
    </>
  );
};
