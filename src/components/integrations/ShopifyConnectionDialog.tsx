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
            // onSuccess will be called if message was received
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
              <li>• A popup will open for Shopify authorization</li>
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
            {loading ? "Waiting for authorization..." : "Connect with Shopify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};