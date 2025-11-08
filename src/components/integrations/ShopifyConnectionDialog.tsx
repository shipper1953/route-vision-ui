import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Store, Loader2, Key, ExternalLink } from "lucide-react";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  onSuccess: () => void;
}

export const ShopifyConnectionDialog = ({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: ShopifyConnectionDialogProps) => {
  const { toast } = useToast();
  const { userProfile, isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || userProfile?.company_id || "");
  const [storeUrl, setStoreUrl] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch companies for super admins
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data && !error) {
        setCompanies(data);
      }
    };
    
    if (isSuperAdmin && open) {
      fetchCompanies();
    }
  }, [isSuperAdmin, open]);

  // Update selected company when dialog opens or companyId changes
  useEffect(() => {
    if (open) {
      setSelectedCompanyId(companyId || userProfile?.company_id || "");
    }
  }, [open, companyId, userProfile?.company_id]);

  // Manual token connection (for custom/private apps)
  const handleManualConnect = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Missing Information",
        description: "Please select a company",
        variant: "destructive",
      });
      return;
    }

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
          companyId: selectedCompanyId,
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
    if (!selectedCompanyId) {
      toast({
        title: "Missing Information",
        description: "Please select a company",
        variant: "destructive",
      });
      return;
    }

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
          companyId: selectedCompanyId,
          customerName: customerName || undefined,
          customerEmail: customerEmail || undefined,
          customerReference: customerReference || undefined,
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

        // Listen for message from popup - set up BEFORE opening
        let messageReceived = false;
        
        const handleMessage = (event: MessageEvent) => {
          console.log('Received postMessage:', event.data);
          
          if (event.data.type === 'shopify-oauth-success') {
            messageReceived = true;
            window.removeEventListener('message', handleMessage);
            
            if (checkInterval) clearInterval(checkInterval);
            if (timeoutId) clearTimeout(timeoutId);
            
            setLoading(false);
            onOpenChange(false);
            
            toast({
              title: "Shopify Connected",
              description: "Your store has been connected successfully",
            });
            onSuccess();
          } else if (event.data.type === 'shopify-oauth-error') {
            messageReceived = true;
            window.removeEventListener('message', handleMessage);
            
            if (checkInterval) clearInterval(checkInterval);
            if (timeoutId) clearTimeout(timeoutId);
            
            setLoading(false);
            toast({
              title: "Connection Failed",
              description: event.data.error || "Failed to connect Shopify",
              variant: "destructive",
            });
          }
        };

        window.addEventListener('message', handleMessage);
        console.log('Message listener added, waiting for OAuth...');

        // Check if popup was blocked
        if (!popup || popup.closed) {
          window.removeEventListener('message', handleMessage);
          throw new Error('Popup was blocked. Please allow popups for this site.');
        }

        // Check if popup closed - if it closes and we didn't get message, assume success and refresh
        let checkInterval: NodeJS.Timeout | null = null;
        let timeoutId: NodeJS.Timeout | null = null;
        
        checkInterval = setInterval(() => {
          if (popup.closed) {
            console.log('Popup closed, message received:', messageReceived);
            clearInterval(checkInterval!);
            clearTimeout(timeoutId!);
            window.removeEventListener('message', handleMessage);
            
            if (!messageReceived) {
              // Popup closed without message - check if connection succeeded
              setLoading(false);
              toast({
                title: "Checking Connection",
                description: "Verifying Shopify connection...",
              });
              
              // Close dialog and trigger success callback to refresh
              setTimeout(() => {
                onOpenChange(false);
                onSuccess();
              }, 500);
            }
          }
        }, 500);
        
        // Timeout after 5 minutes
        timeoutId = setTimeout(() => {
          if (!messageReceived && popup && !popup.closed) {
            clearInterval(checkInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setLoading(false);
            toast({
              title: "Connection Timeout",
              description: "OAuth process took too long. Please try again.",
              variant: "destructive",
            });
          }
        }, 300000);
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

        {/* Company Selection - Always visible */}
        <div className="space-y-2 pb-4 border-b">
          <Label htmlFor="company">Company</Label>
          {isSuperAdmin ? (
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
              disabled={loading}
            >
              <SelectTrigger id="company">
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={companies.find(c => c.id === selectedCompanyId)?.name || userProfile?.company_id ? 'Loading...' : 'No company'}
              disabled
              className="bg-muted"
            />
          )}
          <p className="text-xs text-muted-foreground">
            This Shopify store will be linked to the selected company
          </p>
        </div>

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

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer/Brand Name (Optional)</Label>
              <Input
                id="customerName"
                placeholder="e.g., Acme Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Name to identify this store in your 3PL operations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Contact Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="contact@customer.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerRef">Reference ID (Optional)</Label>
              <Input
                id="customerRef"
                placeholder="CUST-001"
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Your internal customer reference number
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