import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { useShopifyBulkImport } from "@/hooks/useShopifyBulkImport";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ShopifyOrderSyncSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyOrderSyncSettings = ({ 
  settings, 
  onUpdate, 
  onChange,
  companyId 
}: ShopifyOrderSyncSettingsProps) => {
  const { progress, importing, triggerImport } = useShopifyBulkImport(companyId);
  const orderConfig = settings.sync_config.orders;

  const updateOrderConfig = (updates: Partial<typeof orderConfig>) => {
    onUpdate({
      sync_config: {
        ...settings.sync_config,
        orders: {
          ...orderConfig,
          ...updates,
        },
      },
    });
  };

  const handleBulkImport = () => {
    triggerImport(orderConfig.bulk_import_date_range_days);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Sync Configuration</CardTitle>
          <CardDescription>
            Control how orders are synced between Shopify and Ship Tornado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Order Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync orders from Shopify
              </p>
            </div>
            <Switch
              checked={orderConfig.enabled}
              onCheckedChange={(checked) => {
                updateOrderConfig({ enabled: checked });
                onChange();
              }}
            />
          </div>

          {orderConfig.enabled && (
            <>
              <div className="space-y-3">
                <Label>Sync Direction</Label>
                <RadioGroup
                  value={orderConfig.sync_direction}
                  onValueChange={(value: any) => {
                    updateOrderConfig({ sync_direction: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shopify_to_ship_tornado" id="one-way" />
                    <Label htmlFor="one-way" className="font-normal">
                      Shopify → Ship Tornado (One-way)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bidirectional" id="bidirectional" />
                    <Label htmlFor="bidirectional" className="font-normal">
                      Bidirectional Sync
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label>Import Options</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-import"
                    checked={orderConfig.auto_import}
                    onCheckedChange={(checked: boolean) => {
                      updateOrderConfig({ auto_import: checked });
                      onChange();
                    }}
                  />
                  <Label htmlFor="auto-import" className="font-normal">
                    Auto-import new orders
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-notes"
                    checked={orderConfig.import_order_notes}
                    onCheckedChange={(checked: boolean) => {
                      updateOrderConfig({ import_order_notes: checked });
                      onChange();
                    }}
                  />
                  <Label htmlFor="import-notes" className="font-normal">
                    Import order notes
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-tags"
                    checked={orderConfig.import_tags}
                    onCheckedChange={(checked: boolean) => {
                      updateOrderConfig({ import_tags: checked });
                      onChange();
                    }}
                  />
                  <Label htmlFor="import-tags" className="font-normal">
                    Import order tags
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-metafields"
                    checked={orderConfig.import_metafields}
                    onCheckedChange={(checked: boolean) => {
                      updateOrderConfig({ import_metafields: checked });
                      onChange();
                    }}
                  />
                  <Label htmlFor="import-metafields" className="font-normal">
                    Import metafields
                  </Label>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Historical Import</CardTitle>
          <CardDescription>
            Import historical orders from Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Bulk Import</Label>
              <p className="text-sm text-muted-foreground">
                Allow importing historical orders
              </p>
            </div>
            <Switch
              checked={orderConfig.bulk_import_enabled}
              onCheckedChange={(checked) => {
                updateOrderConfig({ bulk_import_enabled: checked });
                onChange();
              }}
            />
          </div>

          {orderConfig.bulk_import_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="date-range">Import Date Range (days)</Label>
                <Input
                  id="date-range"
                  type="number"
                  min="1"
                  max="365"
                  value={orderConfig.bulk_import_date_range_days}
                  onChange={(e) => {
                    updateOrderConfig({ bulk_import_date_range_days: parseInt(e.target.value) || 30 });
                    onChange();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Import orders from the last {orderConfig.bulk_import_date_range_days} days
                </p>
              </div>

              {progress.status !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Import Progress</span>
                    <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                      {progress.status}
                    </Badge>
                  </div>
                  <Progress value={(progress.processed / progress.total) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {progress.processed} / {progress.total} orders processed
                    {progress.failed > 0 && ` (${progress.failed} failed)`}
                  </p>
                </div>
              )}

              <Button
                onClick={handleBulkImport}
                disabled={importing || !settings.connection.connected}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Import Historical Orders
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
