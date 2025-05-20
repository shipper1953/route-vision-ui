
import { Separator } from "@/components/ui/separator";

export const SecurityPlaceholder = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your security preferences
        </p>
      </div>
      <Separator />
      <div className="p-6 bg-muted rounded-md">
        <p className="text-muted-foreground text-center">
          Security settings coming soon
        </p>
      </div>
    </div>
  );
};
