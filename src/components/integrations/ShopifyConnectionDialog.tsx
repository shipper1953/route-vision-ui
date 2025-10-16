import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    storeUrl: "",
    accessToken: "",
  });

  const handleTestConnection = async () => {
    if (!formData.storeUrl || !formData.accessToken) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('shopify-test-connection', {
        body: {
          storeUrl: formData.storeUrl,
          accessToken: formData.accessToken,
        },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult({
          success: true,
          message: `Connected to ${data.shop.name}`,
        });
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${data.shop.name}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed",
        });
        toast({
          title: "Connection Failed",
          description: data.error || "Unable to connect to Shopify",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setTestResult({
        success: false,
        message: error.message,
      });
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.storeUrl || !formData.accessToken) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('shopify-save-credentials', {
        body: {
          companyId,
          storeUrl: formData.storeUrl,
          accessToken: formData.accessToken,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Shopify Connected",
          description: "Your Shopify store has been connected successfully",
        });
        onSuccess();
        onOpenChange(false);
        setFormData({ storeUrl: "", accessToken: "" });
        setTestResult(null);
      } else {
        throw new Error(data.error || "Failed to save credentials");
      }
    } catch (error: any) {
      console.error('Save credentials error:', error);
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Shopify Store</DialogTitle>
          <DialogDescription>
            Enter your Shopify store credentials to enable bidirectional order sync
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL *</Label>
            <Input
              id="storeUrl"
              placeholder="mystore.myshopify.com"
              value={formData.storeUrl}
              onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Your Shopify store URL (e.g., mystore.myshopify.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Admin API Access Token *</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="shpat_..."
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Create a custom app in your Shopify admin to get an access token
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || testing || !testResult?.success}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
