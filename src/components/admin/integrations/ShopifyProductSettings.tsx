import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { Badge } from "@/components/ui/badge";

interface ShopifyProductSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
}

export const ShopifyProductSettings = ({ 
  settings, 
  onUpdate, 
  onChange 
}: ShopifyProductSettingsProps) => {
  const productConfig = settings.sync_config.products;

  const updateProductConfig = (updates: Partial<typeof productConfig>) => {
    onUpdate({
      sync_config: {
        ...settings.sync_config,
        products: {
          ...productConfig,
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
            <CardTitle>Product Sync Settings</CardTitle>
            <CardDescription>
              Import products from Shopify to Item Master
            </CardDescription>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 opacity-60 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Product Sync</Label>
            <p className="text-sm text-muted-foreground">
              Import products from Shopify
            </p>
          </div>
          <Switch checked={productConfig.enabled} disabled />
        </div>

        <div className="space-y-4">
          <Label>Import Options</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="import-variants"
              checked={productConfig.import_variants}
              disabled
            />
            <Label htmlFor="import-variants" className="font-normal">
              Import product variants
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="import-bundles"
              checked={productConfig.import_bundles}
              disabled
            />
            <Label htmlFor="import-bundles" className="font-normal">
              Import product bundles
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync-dimensions"
              checked={productConfig.sync_product_dimensions}
              disabled
            />
            <Label htmlFor="sync-dimensions" className="font-normal">
              Sync product dimensions
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync-weight"
              checked={productConfig.sync_product_weight}
              disabled
            />
            <Label htmlFor="sync-weight" className="font-normal">
              Sync product weight
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="map-to-item-master"
              checked={productConfig.map_to_item_master}
              disabled
            />
            <Label htmlFor="map-to-item-master" className="font-normal">
              Auto-map to Item Master
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
