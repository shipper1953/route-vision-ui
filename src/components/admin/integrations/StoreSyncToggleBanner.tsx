import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Store, AlertCircle } from "lucide-react";

interface StoreSyncToggleBannerProps {
  syncType: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const StoreSyncToggleBanner = ({ syncType, enabled, onToggle }: StoreSyncToggleBannerProps) => {
  return (
    <Alert variant={enabled ? "default" : "destructive"} className="mb-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {enabled ? <Store className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {enabled
              ? `${syncType} sync is enabled for this store`
              : `${syncType} sync is disabled for this store. Global settings still apply but won't sync for this store.`}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Label htmlFor={`store-${syncType}-toggle`} className="text-sm">
            {enabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id={`store-${syncType}-toggle`}
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
    </Alert>
  );
};
