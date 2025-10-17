import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Store, CheckCircle2 } from "lucide-react";
import { ShopifyConnectionDialog } from "./ShopifyConnectionDialog";
import { useShopifyConnection } from "@/hooks/useShopifyConnection";
import { useAuth } from "@/hooks/useAuth";

export const ShopifyConnectionButton = () => {
  const { userProfile } = useAuth();
  const { isConnected, loading, refetch } = useShopifyConnection();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Refetch connection status when component mounts or becomes visible
  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading || !userProfile?.company_id) {
    return null;
  }

  return (
    <>
      <Button
        variant={isConnected ? "outline" : "default"}
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        {isConnected ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Shopify Connected
          </>
        ) : (
          <>
            <Store className="h-4 w-4" />
            Connect Shopify
          </>
        )}
      </Button>

      <ShopifyConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={userProfile.company_id}
        onSuccess={refetch}
      />
    </>
  );
};
