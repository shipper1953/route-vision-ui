import { useEffect, useState } from "react";
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
  type SyncConfig = ShopifySettings["sync_config"];
  const [localSyncConfig, setLocalSyncConfig] = useState<SyncConfig>(settings.sync_config);

  useEffect(() => {
    setLocalSyncConfig(settings.sync_config);
  }, [settings.sync_config]);

  const { progress, importing, triggerImport } = useShopifyBulkImport(companyId);
  const orderConfig = localSyncConfig.orders;
  const transferConfig = localSyncConfig.transfer_orders;
  const purchaseConfig = localSyncConfig.purchase_orders;
  const receiptConfig = localSyncConfig.receipts;

  const updateSyncSection = <K extends keyof SyncConfig>(
    section: K,
    updates: Partial<SyncConfig[K]>
  ) => {
    setLocalSyncConfig((previous) => {
      const nextSection = {
        ...previous[section],
        ...updates,
      };

      const nextConfig = {
        ...previous,
        [section]: nextSection,
      } as SyncConfig;

      onUpdate({
        sync_config: nextConfig,
      });

      return nextConfig;
    });
  };

  const transferStatusOptions = [
    { id: 'open', label: 'Open' },
    { id: 'incoming', label: 'Incoming' },
    { id: 'closed', label: 'Closed (for reconciliation)' },
  ];

  const purchaseStatusOptions = [
    { id: 'open', label: 'Open' },
    { id: 'incoming', label: 'Partially Received' },
    { id: 'closed', label: 'Closed (for reconciliation)' },
  ];

  const updateOrderConfig = (updates: Partial<typeof orderConfig>) => {
    updateSyncSection("orders", updates);
  };

  const updateTransferOrderConfig = (updates: Partial<typeof transferConfig>) => {
    updateSyncSection("transfer_orders", updates);
  };

  const updatePurchaseOrderConfig = (updates: Partial<typeof purchaseConfig>) => {
    updateSyncSection("purchase_orders", updates);
  };

  const updateReceiptConfig = (updates: Partial<typeof receiptConfig>) => {
    updateSyncSection("receipts", updates);
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
          <CardTitle>Transfer Order Sync</CardTitle>
          <CardDescription>
            Import Shopify transfer orders into Ship Tornado and keep receipts in sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Transfer Order Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create Ship Tornado transfer orders when Shopify initiates stock transfers
              </p>
            </div>
            <Switch
              checked={transferConfig.enabled}
              onCheckedChange={(checked) => {
                updateTransferOrderConfig({ enabled: checked });
                onChange();
              }}
            />
          </div>

          {transferConfig.enabled && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transfer-auto-import"
                  checked={transferConfig.auto_import}
                  onCheckedChange={(checked) => {
                    updateTransferOrderConfig({ auto_import: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="transfer-auto-import" className="font-normal">
                  Auto-import new transfer orders
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Shopify Statuses to Import</Label>
                {transferStatusOptions.map((status) => {
                  const isChecked = transferConfig.import_status_filter.includes(status.id);
                  return (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`transfer-status-${status.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const shouldInclude = checked === true;
                          const updated = shouldInclude
                            ? Array.from(new Set([...transferConfig.import_status_filter, status.id]))
                            : transferConfig.import_status_filter.filter((value) => value !== status.id);
                          updateTransferOrderConfig({ import_status_filter: updated });
                          onChange();
                        }}
                      />
                      <Label htmlFor={`transfer-status-${status.id}`} className="font-normal">
                        {status.label}
                      </Label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transfer-sync-receipts"
                  checked={transferConfig.sync_receipts}
                  onCheckedChange={(checked) => {
                    updateTransferOrderConfig({ sync_receipts: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="transfer-sync-receipts" className="font-normal">
                  Sync received quantities back to Shopify
                </Label>
              </div>

              <div className="space-y-3">
                <Label>Receipt Sync Mode</Label>
                <RadioGroup
                  value={transferConfig.receipt_sync_mode}
                  onValueChange={(value: typeof transferConfig.receipt_sync_mode) => {
                    updateTransferOrderConfig({ receipt_sync_mode: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quantities_only" id="transfer-receipts-qty" />
                    <Label htmlFor="transfer-receipts-qty" className="font-normal">
                      Quantities only (fast, inventory safe)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="detailed" id="transfer-receipts-detailed" />
                    <Label htmlFor="transfer-receipts-detailed" className="font-normal">
                      Detailed line updates (SKU + lot/serial when available)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Inventory Integrity Strategy</Label>
                <RadioGroup
                  value={transferConfig.inventory_mode}
                  onValueChange={(value: typeof transferConfig.inventory_mode) => {
                    updateTransferOrderConfig({ inventory_mode: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="respect_shopify" id="transfer-inventory-respect" />
                    <Label htmlFor="transfer-inventory-respect" className="font-normal">
                      Respect Shopify as source of record (no negative adjustments)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ship_tornado_source_of_truth" id="transfer-inventory-ship" />
                    <Label htmlFor="transfer-inventory-ship" className="font-normal">
                      Ship Tornado is source of truth (override Shopify on receipt)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Sync</CardTitle>
          <CardDescription>
            Bring Shopify purchase orders into Ship Tornado and push receipts back automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Purchase Order Sync</Label>
              <p className="text-sm text-muted-foreground">
                Create Ship Tornado purchase orders for incoming Shopify replenishment orders
              </p>
            </div>
            <Switch
              checked={purchaseConfig.enabled}
              onCheckedChange={(checked) => {
                updatePurchaseOrderConfig({ enabled: checked });
                onChange();
              }}
            />
          </div>

          {purchaseConfig.enabled && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="purchase-auto-import"
                  checked={purchaseConfig.auto_import}
                  onCheckedChange={(checked) => {
                    updatePurchaseOrderConfig({ auto_import: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="purchase-auto-import" className="font-normal">
                  Auto-import new purchase orders
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Shopify Statuses to Import</Label>
                {purchaseStatusOptions.map((status) => {
                  const isChecked = purchaseConfig.import_status_filter.includes(status.id);
                  return (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`purchase-status-${status.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const shouldInclude = checked === true;
                          const updated = shouldInclude
                            ? Array.from(new Set([...purchaseConfig.import_status_filter, status.id]))
                            : purchaseConfig.import_status_filter.filter((value) => value !== status.id);
                          updatePurchaseOrderConfig({ import_status_filter: updated });
                          onChange();
                        }}
                      />
                      <Label htmlFor={`purchase-status-${status.id}`} className="font-normal">
                        {status.label}
                      </Label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="purchase-sync-receipts"
                  checked={purchaseConfig.sync_receipts}
                  onCheckedChange={(checked) => {
                    updatePurchaseOrderConfig({ sync_receipts: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="purchase-sync-receipts" className="font-normal">
                  Sync received quantities back to Shopify
                </Label>
              </div>

              <div className="space-y-3">
                <Label>Receipt Sync Mode</Label>
                <RadioGroup
                  value={purchaseConfig.receipt_sync_mode}
                  onValueChange={(value: typeof purchaseConfig.receipt_sync_mode) => {
                    updatePurchaseOrderConfig({ receipt_sync_mode: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quantities_only" id="purchase-receipts-qty" />
                    <Label htmlFor="purchase-receipts-qty" className="font-normal">
                      Quantities only (recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="detailed" id="purchase-receipts-detailed" />
                    <Label htmlFor="purchase-receipts-detailed" className="font-normal">
                      Detailed line updates with cost data
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Inventory Integrity Strategy</Label>
                <RadioGroup
                  value={purchaseConfig.inventory_mode}
                  onValueChange={(value: typeof purchaseConfig.inventory_mode) => {
                    updatePurchaseOrderConfig({ inventory_mode: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="respect_shopify" id="purchase-inventory-respect" />
                    <Label htmlFor="purchase-inventory-respect" className="font-normal">
                      Respect Shopify on quantity and cost (no adjustments)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ship_tornado_source_of_truth" id="purchase-inventory-ship" />
                    <Label htmlFor="purchase-inventory-ship" className="font-normal">
                      Ship Tornado drives adjustments when receipts differ
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="purchase-allow-cost-updates"
                  checked={purchaseConfig.allow_cost_updates}
                  onCheckedChange={(checked) => {
                    updatePurchaseOrderConfig({ allow_cost_updates: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="purchase-allow-cost-updates" className="font-normal">
                  Push updated item costs from receipts back to Shopify
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Sync Assurance</CardTitle>
          <CardDescription>
            Control how Ship Tornado posts received quantities back into Shopify to protect inventory accuracy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sync Receipts to Shopify</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, Ship Tornado will update Shopify whenever receipts are posted
              </p>
            </div>
            <Switch
              checked={receiptConfig.sync_back_enabled}
              onCheckedChange={(checked) => {
                updateReceiptConfig({ sync_back_enabled: checked });
                onChange();
              }}
            />
          </div>

          {receiptConfig.sync_back_enabled && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Sync Direction</Label>
                <RadioGroup
                  value={receiptConfig.sync_direction}
                  onValueChange={(value: typeof receiptConfig.sync_direction) => {
                    updateReceiptConfig({ sync_direction: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ship_tornado_to_shopify" id="receipt-direction-one-way" />
                    <Label htmlFor="receipt-direction-one-way" className="font-normal">
                      Ship Tornado → Shopify (recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bidirectional" id="receipt-direction-bidirectional" />
                    <Label htmlFor="receipt-direction-bidirectional" className="font-normal">
                      Bidirectional (Shopify adjustments reopen receipts)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Line Item Matching</Label>
                <RadioGroup
                  value={receiptConfig.match_strategy}
                  onValueChange={(value: typeof receiptConfig.match_strategy) => {
                    updateReceiptConfig({ match_strategy: value });
                    onChange();
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sku" id="receipt-match-sku" />
                    <Label htmlFor="receipt-match-sku" className="font-normal">
                      Match by SKU (default)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="variant_id" id="receipt-match-variant" />
                    <Label htmlFor="receipt-match-variant" className="font-normal">
                      Match by Shopify variant ID
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receipt-enforce-location"
                  checked={receiptConfig.enforce_location_match}
                  onCheckedChange={(checked) => {
                    updateReceiptConfig({ enforce_location_match: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="receipt-enforce-location" className="font-normal">
                  Require Shopify location to match Ship Tornado receiving location
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receipt-auto-close"
                  checked={receiptConfig.auto_close_orders}
                  onCheckedChange={(checked) => {
                    updateReceiptConfig({ auto_close_orders: checked === true });
                    onChange();
                  }}
                />
                <Label htmlFor="receipt-auto-close" className="font-normal">
                  Auto-close Shopify orders once Ship Tornado receipts are complete
                </Label>
              </div>
            </div>
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
