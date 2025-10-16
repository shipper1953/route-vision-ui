import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";

interface ShopifyProductSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyProductSettings = ({ 
  settings, 
  onUpdate, 
  onChange,
  companyId 
}: ShopifyProductSettingsProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<Date | null>(null);
  const [importStats, setImportStats] = useState<{
    total: number;
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);
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
    onChange();
  };

  const handleImportProducts = async () => {
    if (!companyId) {
      toast.error('Company ID not found');
      return;
    }

    setIsImporting(true);
    try {
      console.log('Starting product import from Shopify...');
      
      const { data, error } = await supabase.functions.invoke('shopify-sync-products', {
        body: {
          companyId,
          importVariants: productConfig.import_variants,
          importBundles: productConfig.import_bundles,
          syncDimensions: productConfig.sync_product_dimensions,
          syncWeight: productConfig.sync_product_weight,
          mapToItemMaster: productConfig.map_to_item_master
        }
      });

      if (error) {
        throw error;
      }

      console.log('Import result:', data);
      setLastImport(new Date());
      setImportStats(data.stats);
      
      if (data.success) {
        toast.success(`Products imported: ${data.stats.imported} new, ${data.stats.updated} updated`);
      } else {
        toast.error('Product import failed');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import products');
    } finally {
      setIsImporting(false);
    }
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
          <Button 
            onClick={handleImportProducts} 
            disabled={!productConfig.enabled || isImporting}
            variant="outline"
            size="sm"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {lastImport && importStats && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Last import: {lastImport.toLocaleString()}</strong>
              <div className="mt-1 text-xs space-y-0.5">
                <div>{importStats.total} products processed</div>
                <div>{importStats.imported} items imported • {importStats.updated} items updated</div>
                {importStats.errors > 0 && (
                  <div className="text-destructive">{importStats.errors} errors occurred</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Product Sync</Label>
            <p className="text-sm text-muted-foreground">
              Import products from Shopify
            </p>
          </div>
          <Switch 
            checked={productConfig.enabled}
            onCheckedChange={(checked) => updateProductConfig({ enabled: checked })}
          />
        </div>

        <div className="space-y-4">
          <Label>Import Options</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="import-variants"
              checked={productConfig.import_variants}
              onCheckedChange={(checked) => updateProductConfig({ import_variants: checked as boolean })}
              disabled={!productConfig.enabled}
            />
            <Label htmlFor="import-variants" className="font-normal">
              Import product variants as separate items
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="import-bundles"
              checked={productConfig.import_bundles}
              onCheckedChange={(checked) => updateProductConfig({ import_bundles: checked as boolean })}
              disabled={!productConfig.enabled}
            />
            <Label htmlFor="import-bundles" className="font-normal">
              Import product bundles (coming soon)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync-dimensions"
              checked={productConfig.sync_product_dimensions}
              onCheckedChange={(checked) => updateProductConfig({ sync_product_dimensions: checked as boolean })}
              disabled={!productConfig.enabled}
            />
            <Label htmlFor="sync-dimensions" className="font-normal">
              Sync product dimensions (uses 12x12x12 defaults if missing)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync-weight"
              checked={productConfig.sync_product_weight}
              onCheckedChange={(checked) => updateProductConfig({ sync_product_weight: checked as boolean })}
              disabled={!productConfig.enabled}
            />
            <Label htmlFor="sync-weight" className="font-normal">
              Sync product weight (converts to lbs)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="map-to-item-master"
              checked={productConfig.map_to_item_master}
              onCheckedChange={(checked) => updateProductConfig({ map_to_item_master: checked as boolean })}
              disabled={!productConfig.enabled}
            />
            <Label htmlFor="map-to-item-master" className="font-normal">
              Auto-map to Item Master
            </Label>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> Product import will create or update items in your Item Master. 
            Existing items with matching SKUs will be updated. Make sure your Shopify product SKUs are unique and descriptive.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
