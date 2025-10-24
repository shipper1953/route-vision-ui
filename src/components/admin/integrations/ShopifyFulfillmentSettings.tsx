import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShopifyFulfillmentSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyFulfillmentSettings = ({ 
  settings, 
  onUpdate, 
  onChange,
  companyId 
}: ShopifyFulfillmentSettingsProps) => {
  const fulfillmentConfig = settings.sync_config.fulfillment;
  const { toast } = useToast();
  const [registering, setRegistering] = useState(false);

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

  const handleRegisterFulfillmentService = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID is required",
        variant: "destructive",
      });
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-register-fulfillment-service', {
        body: { companyId },
      });

      if (error) throw error;

      toast({
        title: "Fulfillment Service Registered",
        description: "Ship Tornado has been registered as a fulfillment service in your Shopify store",
      });

      // Refresh settings to show updated status
      onChange();
    } catch (error: any) {
      console.error('Failed to register fulfillment service:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register fulfillment service",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const fulfillmentService = settings.fulfillment_service;
  const isRegistered = !!fulfillmentService?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment Settings</CardTitle>
        <CardDescription>
          Control how fulfillment updates are synced to Shopify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fulfillment Service Status */}
        <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/50">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Label className="text-base">Fulfillment Service Status</Label>
              {isRegistered ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Registered
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Registered
                </Badge>
              )}
            </div>
            {isRegistered ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Ship Tornado is registered as a fulfillment service in your Shopify store</p>
                <p className="font-medium">Location: {fulfillmentService.location_name}</p>
                <p className="text-xs">Registered: {new Date(fulfillmentService.registered_at).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Fulfillment service registration enables advanced fulfillment features and better partial fulfillment support
              </p>
            )}
          </div>
          <Button
            variant={isRegistered ? "outline" : "default"}
            size="sm"
            onClick={handleRegisterFulfillmentService}
            disabled={registering || !settings.connection.connected}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${registering ? 'animate-spin' : ''}`} />
            {registering ? 'Registering...' : isRegistered ? 'Re-register' : 'Register Service'}
          </Button>
        </div>
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
