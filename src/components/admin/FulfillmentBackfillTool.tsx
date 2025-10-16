import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FulfillmentBackfillTool = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    stats?: {
      processed: number;
      updated: number;
      skipped: number;
      errors: number;
    };
    errors?: string[];
    message?: string;
  } | null>(null);

  const handleRunBackfill = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      console.log('Running fulfillment item backfill...');

      const { data, error } = await supabase.functions.invoke('backfill-fulfillment-items', {
        body: { limit: 200 } // Process up to 200 records at a time
      });

      if (error) {
        throw error;
      }

      console.log('Backfill result:', data);
      setResult(data);

      if (data.success) {
        toast.success(`Backfill completed: ${data.stats.updated} records updated`);
      } else {
        toast.error('Backfill failed');
      }

    } catch (error) {
      console.error('Backfill error:', error);
      toast.error('Failed to run backfill');
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Fulfillment Items Backfill
        </CardTitle>
        <CardDescription>
          Backfill item-level tracking data for existing shipments that don't have items recorded in order_shipments.package_info
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This tool will:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
            <li>Find order_shipments records without item tracking</li>
            <li>Copy items from the linked orders table</li>
            <li>Update package_info with item data</li>
            <li>Enable partial fulfillment reporting for historical orders</li>
          </ul>
        </div>

        <Button 
          onClick={handleRunBackfill}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Backfill...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Run Backfill (200 records max)
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.success && result.stats ? (
                <div className="space-y-1">
                  <p className="font-medium">Backfill completed successfully!</p>
                  <div className="text-sm space-y-0.5">
                    <p>• Processed: {result.stats.processed} records</p>
                    <p>• Updated: {result.stats.updated} records</p>
                    <p>• Skipped: {result.stats.skipped} records</p>
                    {result.stats.errors > 0 && (
                      <p className="text-destructive">• Errors: {result.stats.errors} records</p>
                    )}
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">View Errors</summary>
                      <div className="mt-1 text-xs space-y-1">
                        {result.errors.map((error, idx) => (
                          <p key={idx} className="text-destructive">• {error}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <p>{result.message || 'Backfill failed'}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
