import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

const GenerateDemoOrders = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateOrders = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to generate demo orders");
        return;
      }

      const supabaseUrl = 'https://gidrlosmhpvdcogrkidj.supabase.co';
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-demo-orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate orders');
      }

      toast.success(`Successfully created ${result.ordersCreated} demo orders!`);
    } catch (error) {
      console.error('Error generating orders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate demo orders');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TmsLayout>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Generate Demo Orders
            </CardTitle>
            <CardDescription>
              Create 50 random orders for the Demo company with all necessary details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">What will be created:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>50 random orders assigned to Demo company</li>
                <li>Random customer names, companies, emails, and phone numbers</li>
                <li>Random US shipping addresses</li>
                <li>1-5 random items per order from the item master</li>
                <li>Item prices rounded to 2 decimal places</li>
                <li>Required delivery dates between Oct 17-25, 2025</li>
                <li>Random status: processing or ready_to_ship</li>
              </ul>
            </div>

            <Button
              onClick={handleGenerateOrders}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Orders...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Generate 50 Demo Orders
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This action will create new orders in the database. Make sure the Demo company has items in the item master.
            </p>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
};

export default GenerateDemoOrders;
