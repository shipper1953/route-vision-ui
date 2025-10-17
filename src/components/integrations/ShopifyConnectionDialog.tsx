import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Store, Loader2, Key, ExternalLink } from "lucide-react";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export const ShopifyConnectionDialog = ({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: ShopifyConnectionDialogProps) => {
  const { toast } = useToast();
  const [storeUrl, setStoreUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  // Manual token connection (for custom/private apps)
  const handleManualConnect = async () => {
    if (!storeUrl || !accessToken) {
      toast({
        title: "Missing Information",
        description: "Please enter both store URL and Admin API access token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      const { error } = await supabase.functions.invoke('shopify-save-credentials', {
        body: {
          storeUrl: cleanUrl,
          accessToken,
          companyId,
        },
      });

      if (error) throw error;

      toast({
        title: "Shopify Connected",
        description: "Your store has been connected successfully with Admin API token",
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Manual connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Shopify",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // OAuth connection (for public apps)
  const handleOAuthConnect = async () => {
    if (!storeUrl) {
      toast({
        title: "Missing Information",
        description: "Please enter your store URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('shopify-oauth-start', {
        body: {
          storeUrl,
          companyId,
        },
      });

      if (error) throw error;

      if (data.authUrl) {
        console.log('Opening Shopify OAuth URL:', data.authUrl);
        
        // Open OAuth in popup window
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          data.authUrl,
          'shopify-oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );
        
        console.log('Popup opened:', !!popup);

        // Listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'shopify-oauth-success') {
            window.removeEventListener('message', handleMessage);
            setLoading(false);
            onOpenChange(false);
            toast({
              title: "Shopify Connected",
              description: "Your store has been connected successfully",
            });
            onSuccess();
          } else if (event.data.type === 'shopify-oauth-error') {
            window.removeEventListener('message', handleMessage);
            setLoading(false);
            toast({
              title: "Connection Failed",
              description: event.data.error || "Failed to connect Shopify",
              variant: "destructive",
            });
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was blocked
        if (!popup || popup.closed) {
          window.removeEventListener('message', handleMessage);
          throw new Error('Popup was blocked. Please allow popups for this site.');
        }

        // Fallback: Check if popup closed without message
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
          }
        }, 500);
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('OAuth start error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start Shopify connection",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Connect Shopify Store
          </DialogTitle>
          <DialogDescription>
            Choose how to connect your Shopify store
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Key className="h-4 w-4 mr-2" />
              Custom App
            </TabsTrigger>
            <TabsTrigger value="oauth">
              <ExternalLink className="h-4 w-4 mr-2" />
              Public App
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manualStoreUrl">Store URL</Label>
              <Input
                id="manualStoreUrl"
                placeholder="your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Admin API Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="shpat_..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={loading}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                From Shopify Admin → Settings → Apps and sales channels → Develop apps
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">For Custom/Private Apps:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Go to Shopify Admin → Settings → Apps and sales channels</li>
                <li>• Click "Develop apps" → Select your app</li>
                <li>• Go to "API credentials" → Copy Admin API access token</li>
                <li>• Make sure you have the required scopes enabled</li>
              </ul>
            </div>

            <Button
              onClick={handleManualConnect}
              disabled={loading || !storeUrl || !accessToken}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Connecting..." : "Connect with Token"}
            </Button>
          </TabsContent>

          <TabsContent value="oauth" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oauthStoreUrl">Store URL</Label>
              <Input
                id="oauthStoreUrl"
                placeholder="your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Enter your .myshopify.com domain
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">For Public/Partner Apps:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A popup will open for Shopify authorization</li>
                <li>• Secure OAuth authentication</li>
                <li>• Automatic webhook setup</li>
              </ul>
            </div>

            <Button
              onClick={handleOAuthConnect}
              disabled={loading || !storeUrl}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Waiting for authorization..." : "Connect with OAuth"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};