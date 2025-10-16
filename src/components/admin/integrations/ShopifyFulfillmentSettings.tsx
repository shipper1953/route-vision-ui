import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ShopifySettings } from "@/hooks/useShopifySettings";

interface ShopifyFulfillmentSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyFulfillmentSettings = ({ 
  settings, 
  onUpdate, 
  onChange 
}: ShopifyFulfillmentSettingsProps) => {
  const fulfillmentConfig = settings.sync_config.fulfillment;

  const updateFulfillmentConfig = (updates: Partial<typeof fulfillmentConfig>) => {
    onUpdate({
      sync_config: {
        ...settings.sync_config,
        fulfillment: {
          ...fulfillmentConfig,
          ...updates,
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment Settings</CardTitle>
        <CardDescription>
          Control how fulfillment updates are synced to Shopify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Fulfillment Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically update Shopify when orders are fulfilled
            </p>
          </div>
          <Switch
            checked={fulfillmentConfig.enabled}
            onCheckedChange={(checked) => {
              updateFulfillmentConfig({ enabled: checked });
              onChange();
            }}
          />
        </div>

        {fulfillmentConfig.enabled && (
          <>
            <div className="space-y-4">
              <Label>Fulfillment Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-update"
                  checked={fulfillmentConfig.auto_update_on_ship}
                  onCheckedChange={(checked: boolean) => {
                    updateFulfillmentConfig({ auto_update_on_ship: checked });
                    onChange();
                  }}
                />
                <Label htmlFor="auto-update" className="font-normal">
                  Auto-update Shopify when shipment is created
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-tracking"
                  checked={fulfillmentConfig.update_tracking}
                  onCheckedChange={(checked: boolean) => {
                    updateFulfillmentConfig({ update_tracking: checked });
                    onChange();
                  }}
                />
                <Label htmlFor="update-tracking" className="font-normal">
                  Send tracking information to Shopify
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify-customer"
                  checked={fulfillmentConfig.notify_customer}
                  onCheckedChange={(checked: boolean) => {
                    updateFulfillmentConfig({ notify_customer: checked });
                    onChange();
                  }}
                />
                <Label htmlFor="notify-customer" className="font-normal">
                  Send customer notification via Shopify
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partial-fulfillment"
                  checked={fulfillmentConfig.support_partial_fulfillment}
                  onCheckedChange={(checked: boolean) => {
                    updateFulfillmentConfig({ support_partial_fulfillment: checked });
                    onChange();
                  }}
                />
                <Label htmlFor="partial-fulfillment" className="font-normal">
                  Support partial fulfillments
                </Label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Multi-Location Fulfillment</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable fulfillment from multiple Shopify locations
                  </p>
                </div>
                <Switch
                  checked={fulfillmentConfig.multi_location_enabled}
                  onCheckedChange={(checked) => {
                    updateFulfillmentConfig({ multi_location_enabled: checked });
                    onChange();
                  }}
                />
              </div>

              {fulfillmentConfig.multi_location_enabled && (
                <p className="text-sm text-muted-foreground">
                  Configure warehouse-to-location mapping in the Advanced settings
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
