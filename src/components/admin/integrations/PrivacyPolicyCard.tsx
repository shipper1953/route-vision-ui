import { Shield, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const PrivacyPolicyCard = () => {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const privacyPolicyUrl = `${window.location.origin}/privacy`;
  const supabaseUrl = "https://gidrlosmhpvdcogrkidj.supabase.co";
  
  const webhookUrls = {
    customerData: `${supabaseUrl}/functions/v1/shopify-gdpr-customer-data`,
    customerRedact: `${supabaseUrl}/functions/v1/shopify-gdpr-customer-redact`,
    shopRedact: `${supabaseUrl}/functions/v1/shopify-gdpr-shop-redact`,
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} URL copied successfully`,
      });
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy Policy & Compliance</CardTitle>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
            Required for Shopify
          </Badge>
        </div>
        <CardDescription>
          Review privacy policy required for Shopify app integration and GDPR compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your app's privacy policy is available at the URL below. You must add this URL to your Shopify Partner Dashboard under App Setup → Privacy & Compliance.
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Privacy Policy URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md break-all">
                {privacyPolicyUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(privacyPolicyUrl, "Privacy Policy")}
              >
                {copiedUrl === "Privacy Policy" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={() => window.open(privacyPolicyUrl, '_blank')}
            className="w-full sm:w-auto"
          >
            View Privacy Policy
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-3">GDPR Webhook URLs</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add these webhook URLs to your Shopify Partner Dashboard under App Setup → Privacy & Compliance → GDPR Webhooks.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Customer Data Request</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md break-all">
                  {webhookUrls.customerData}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrls.customerData, "Customer Data")}
                >
                  {copiedUrl === "Customer Data" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Customer Redaction</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md break-all">
                  {webhookUrls.customerRedact}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrls.customerRedact, "Customer Redaction")}
                >
                  {copiedUrl === "Customer Redaction" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Shop Redaction</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md break-all">
                  {webhookUrls.shopRedact}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrls.shopRedact, "Shop Redaction")}
                >
                  {copiedUrl === "Shop Redaction" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
