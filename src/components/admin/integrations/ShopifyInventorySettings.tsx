import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { Badge } from "@/components/ui/badge";

interface ShopifyInventorySettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
}

export const ShopifyInventorySettings = ({ 
  settings, 
  onUpdate, 
  onChange 
}: ShopifyInventorySettingsProps) => {
  const inventoryConfig = settings.sync_config.inventory;

  const updateInventoryConfig = (updates: Partial<typeof inventoryConfig>) => {
    onUpdate({
      sync_config: {
        ...settings.sync_config,
        inventory: {
          ...inventoryConfig,
          ...updates,
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Inventory Sync Settings</CardTitle>
            <CardDescription>
              Sync inventory levels between Ship Tornado and Shopify
            </CardDescription>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 opacity-60 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Inventory Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync inventory between systems
            </p>
          </div>
          <Switch checked={inventoryConfig.enabled} disabled />
        </div>

        <div className="space-y-3">
          <Label>Sync Direction</Label>
          <RadioGroup value={inventoryConfig.sync_direction} disabled>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ship_tornado_to_shopify" id="inv-one-way" />
              <Label htmlFor="inv-one-way" className="font-normal">
                Ship Tornado → Shopify
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bidirectional" id="inv-bidirectional" />
              <Label htmlFor="inv-bidirectional" className="font-normal">
                Bidirectional
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Sync Frequency</Label>
          <Select value={inventoryConfig.sync_frequency} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_time">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sync-threshold">Sync Threshold</Label>
          <Input
            id="sync-threshold"
            type="number"
            value={inventoryConfig.sync_threshold}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Only sync when inventory changes by this amount
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Low Stock Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when inventory is low
            </p>
          </div>
          <Switch checked={inventoryConfig.low_stock_alert} disabled />
        </div>
      </CardContent>
    </Card>
  );
};
