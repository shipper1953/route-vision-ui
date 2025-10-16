import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Store, Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
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
        // Open OAuth in popup window
        const popup = window.open(
          data.authUrl,
          'shopify-oauth',
          'width=600,height=700,scrollbars=yes'
        );

        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Listen for OAuth callback message
        const messageHandler = (event: MessageEvent) => {
          // Verify origin for security
          if (!event.origin.includes('supabase.co')) return;

          if (event.data.type === 'shopify-oauth-success') {
            window.removeEventListener('message', messageHandler);
            toast({
              title: "Connected!",
              description: "Your Shopify store has been connected successfully",
            });
            setLoading(false);
            onOpenChange(false);
            onSuccess();
          } else if (event.data.type === 'shopify-oauth-error') {
            window.removeEventListener('message', messageHandler);
            toast({
              title: "Connection Failed",
              description: event.data.message || "Failed to connect Shopify store",
              variant: "destructive",
            });
            setLoading(false);
          }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup if popup is closed manually
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            window.removeEventListener('message', messageHandler);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Connect Shopify Store
          </DialogTitle>
          <DialogDescription>
            Enter your Shopify store URL to begin the secure OAuth connection process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL</Label>
            <Input
              id="storeUrl"
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
            <h4 className="font-medium text-sm">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You'll be redirected to Shopify to authorize the connection</li>
              <li>• No need to manually create API keys or tokens</li>
              <li>• Secure OAuth authentication</li>
              <li>• Automatic webhook setup for order syncing</li>
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            disabled={loading || !storeUrl}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Redirecting to Shopify..." : "Connect with Shopify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
