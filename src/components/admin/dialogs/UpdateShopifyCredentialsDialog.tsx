import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key } from 'lucide-react';

interface UpdateShopifyCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateShopifyCredentialsDialog({ open, onOpenChange }: UpdateShopifyCredentialsDialogProps) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      // Show instructions to update via Lovable AI
      toast({
        title: "Ready to Update Secrets",
        description: "Please tell the Lovable AI to update the secrets with the values you provided.",
        duration: 8000,
      });

      // Display the formatted prompts in console for easy copy-paste
      console.log('=== SHOPIFY CREDENTIALS UPDATE ===');
      console.log('Client ID:', clientId);
      console.log('Client Secret:', clientSecret);
      console.log('');
      console.log('Tell the AI:');
      console.log(`Update SHOPIFY_API_KEY to: ${clientId}`);
      console.log(`Update SHOPIFY_API_SECRET to: ${clientSecret}`);
      console.log('===================================');

      toast({
        title: "Credentials Ready",
        description: "Check the console for your credentials. Tell the AI to update SHOPIFY_API_KEY and SHOPIFY_API_SECRET.",
        duration: 10000,
      });

    } catch (error: any) {
      console.error('Error preparing credentials:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Update Shopify App Credentials
          </DialogTitle>
          <DialogDescription>
            Enter your Shopify Partner app's Client ID and Client Secret from the Partner Dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              placeholder="Paste your Client ID here"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Found in: Shopify Partners → Apps → Your App → Client credentials
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Paste your Client Secret here"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Found in: Shopify Partners → Apps → Your App → Client credentials
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens next:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "Prepare Update" below</li>
              <li>Your credentials will be logged to console</li>
              <li>Tell the Lovable AI to update the secrets</li>
              <li>AI will update SHOPIFY_API_KEY and SHOPIFY_API_SECRET</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating || !clientId || !clientSecret}
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prepare Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}