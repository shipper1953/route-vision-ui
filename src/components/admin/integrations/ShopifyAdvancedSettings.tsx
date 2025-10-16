import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShopifySettings } from "@/hooks/useShopifySettings";
import { Settings, Webhook } from "lucide-react";

interface ShopifyAdvancedSettingsProps {
  settings: ShopifySettings;
  onUpdate: (settings: Partial<ShopifySettings>) => void;
  onChange: () => void;
  companyId?: string;
}

export const ShopifyAdvancedSettings = ({ 
  settings, 
  onUpdate, 
  onChange,
  companyId 
}: ShopifyAdvancedSettingsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Configuration
          </CardTitle>
          <CardDescription>
            Advanced settings for power users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Order Status Mapping</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Map Ship Tornado order statuses to Shopify fulfillment statuses
            </p>
            <div className="space-y-2 text-sm">
              {Object.entries(settings.mappings.order_status_map).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                  <span className="font-medium">{key}</span>
                  <span className="text-muted-foreground">→ {value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Management
          </CardTitle>
          <CardDescription>
            Manage Shopify webhook registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Webhooks are automatically registered when you connect your store. 
            Use these tools if you need to troubleshoot webhook issues.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              View Registered Webhooks
            </Button>
            <Button variant="outline" size="sm">
              Re-register Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
