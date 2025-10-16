import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface ShopifyInventorySettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyInventorySettings = ({ 
  settings, 
  onUpdate, 
  onChange,
  companyId 
}: ShopifyInventorySettingsProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
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
    onChange();
  };

  const handleSyncNow = async () => {
    if (!companyId) {
      toast.error('Company ID not found');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('Starting inventory sync...');
      
      const { data, error } = await supabase.functions.invoke('shopify-sync-inventory', {
        body: {
          companyId,
          direction: inventoryConfig.sync_direction,
          threshold: inventoryConfig.sync_threshold
        }
      });

      if (error) {
        throw error;
      }

      console.log('Sync result:', data);
      setLastSync(new Date());
      
      if (data.success) {
        toast.success(`Inventory synced: ${data.stats.toShopify.updated + data.stats.fromShopify.updated} items updated`);
      } else {
        toast.error('Inventory sync failed');
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync inventory');
    } finally {
      setIsSyncing(false);
    }
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
          <Button 
            onClick={handleSyncNow} 
            disabled={!inventoryConfig.enabled || isSyncing}
            variant="outline"
            size="sm"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {lastSync && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Last synced: {lastSync.toLocaleString()}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Inventory Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync inventory between systems
            </p>
          </div>
          <Switch 
            checked={inventoryConfig.enabled}
            onCheckedChange={(checked) => updateInventoryConfig({ enabled: checked })}
          />
        </div>

        <div className="space-y-3">
          <Label>Sync Direction</Label>
          <RadioGroup 
            value={inventoryConfig.sync_direction}
            onValueChange={(value) => updateInventoryConfig({ sync_direction: value as any })}
            disabled={!inventoryConfig.enabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ship_tornado_to_shopify" id="inv-one-way" />
              <Label htmlFor="inv-one-way" className="font-normal">
                Ship Tornado → Shopify
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shopify_to_ship_tornado" id="inv-from-shopify" />
              <Label htmlFor="inv-from-shopify" className="font-normal">
                Shopify → Ship Tornado
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
          <Select 
            value={inventoryConfig.sync_frequency}
            onValueChange={(value) => updateInventoryConfig({ sync_frequency: value as any })}
            disabled={!inventoryConfig.enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_time">Real-time (webhook-based)</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="manual">Manual Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Real-time requires webhook configuration
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sync-threshold">Sync Threshold</Label>
          <Input
            id="sync-threshold"
            type="number"
            value={inventoryConfig.sync_threshold}
            onChange={(e) => updateInventoryConfig({ sync_threshold: parseInt(e.target.value) || 0 })}
            disabled={!inventoryConfig.enabled}
            min="0"
          />
          <p className="text-xs text-muted-foreground">
            Only sync when inventory changes by this amount (0 = sync all changes)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Low Stock Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when inventory is low
            </p>
          </div>
          <Switch 
            checked={inventoryConfig.low_stock_alert}
            onCheckedChange={(checked) => updateInventoryConfig({ low_stock_alert: checked })}
            disabled={!inventoryConfig.enabled}
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Note:</strong> Inventory sync requires products to be mapped between systems. 
            Make sure to sync products first and verify SKUs match between Ship Tornado and Shopify.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
