
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Address } from "@/types/easypost";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

interface GooglePlacesAutocompleteProps {
  onAddressSelected: (address: Address) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export const GooglePlacesAutocomplete = ({
  onAddressSelected,
  placeholder = "Enter an address...",
  className = "",
  isLoading = false
}: GooglePlacesAutocompleteProps) => {
  const {
    inputRef,
    isScriptLoading,
    scriptLoadError,
    handleRetry,
    loadAndInitAutocomplete
  } = useGooglePlacesAutocomplete({ onAddressSelected });

  // Load Google Maps API on component mount
  useEffect(() => {
    loadAndInitAutocomplete();
    
    // No cleanup needed - handled by the hook
  }, []);

  // If there was an error loading the script, show error message with retry button
  if (scriptLoadError) {
    return (
      <div className={`relative ${className}`}>
        <Input
          type="text"
          placeholder={placeholder}
          disabled={true}
          className="w-full pr-10"
          ref={inputRef}
          aria-label="Address search input"
        />
        <div className="text-sm text-red-500 mt-1">
          {scriptLoadError}
          <button
            onClick={handleRetry}
            className="ml-2 text-blue-500 hover:underline"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {(isLoading || isScriptLoading) && (
        <div className="absolute top-3 right-3 z-10">
          <LoadingSpinner size={16} />
        </div>
      )}
      <Input
        type="text"
        placeholder={placeholder}
        disabled={isLoading || isScriptLoading}
        className="w-full pr-10"
        ref={inputRef}
        aria-label="Address search input"
      />
    </div>
  );
};
