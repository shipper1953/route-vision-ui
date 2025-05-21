
import { useFormContext } from "react-hook-form";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import {
  FormField,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShipmentForm } from "@/types/shipment";
import { Button } from "@/components/ui/button";
import { ScanText, Wifi, WifiOff, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { listenForQboidData } from "@/services/easypost";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export const PackageDetailsSection = () => {
  const form = useFormContext<ShipmentForm>();
  const [configuring, setConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  const handleConfigureQboid = async () => {
    try {
      setConfiguring(true);
      setConnectionStatus('connecting');
      
      // Get the configuration info - await the Promise
      const qboidInfo = await listenForQboidData((dimensions) => {
        // This callback would be called when new dimensions are received
        console.log("Received dimensions from Qboid:", dimensions);
        form.setValue("length", dimensions.length);
        form.setValue("width", dimensions.width);
        form.setValue("height", dimensions.height);
        form.setValue("weight", dimensions.weight);
        
        if (dimensions.orderId) {
          form.setValue("orderId", dimensions.orderId);
        }
        
        setConnectionStatus('connected');
        setLastUpdateTime(new Date().toLocaleTimeString());
        toast.success("Package dimensions updated from Qboid scanner");
      });
      
      // Now we can safely access endpointUrl since we've awaited the Promise
      toast.info("Qboid Integration Info", {
        description: (
          <div className="mt-2 text-sm">
            <p className="font-semibold">Configure your Qboid with this endpoint:</p>
            <p className="mt-1 font-mono text-xs bg-slate-100 p-2 rounded overflow-auto">
              {qboidInfo.endpointUrl}
            </p>
            <p className="mt-2">Use POST method with JSON body containing:</p>
            <p className="mt-1 font-mono text-xs bg-slate-100 p-2 rounded overflow-auto">
              {`{ "length": 12, "width": 8, "height": 6, "weight": 32 }`}
            </p>
            <p className="mt-2 text-blue-600">
              Make sure your Qboid device is on the same network as this computer.
            </p>
          </div>
        ),
        duration: 0, // Keep it visible until dismissed
      });
    } catch (error) {
      console.error("Error configuring Qboid:", error);
      toast.error("Failed to configure Qboid integration");
      setConnectionStatus('disconnected');
    } finally {
      setConfiguring(false);
    }
  };
  
  // Reset connection status when unmounting
  useEffect(() => {
    return () => {
      setConnectionStatus('disconnected');
    };
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
          </div>
          {connectionStatus !== 'disconnected' && (
            <Badge 
              variant={connectionStatus === 'connected' ? "success" : "outline"}
              className={`${connectionStatus === 'connected' ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'} flex items-center gap-1`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <Check className="h-3 w-3" /> Qboid Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" /> Awaiting Data
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Dimensions</h3>
              <span className="text-sm text-muted-foreground">in inches</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Weight</h3>
              <span className="text-sm text-muted-foreground">in oz</span>
            </div>
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormDescription>
                    For packages over 1lb, enter 16oz per pound (e.g., 2lbs = 32oz)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {form.getValues("orderId") && (
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Package data populated from Qboid scanning system for order #{form.getValues("orderId")}
              {lastUpdateTime && <span className="ml-2 text-xs text-slate-500">(Last updated: {lastUpdateTime})</span>}
            </p>
          </div>
        )}

        {connectionStatus === 'connected' && !form.getValues("orderId") && lastUpdateTime && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              Package dimensions received from Qboid at {lastUpdateTime}
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          type="button" 
          onClick={handleConfigureQboid}
          variant="outline"
          className={`flex items-center gap-2 mt-2 ${connectionStatus === 'connected' ? 'bg-green-50' : ''}`}
          disabled={configuring}
        >
          {connectionStatus === 'disconnected' ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <span>
            {configuring 
              ? "Configuring..." 
              : connectionStatus === 'connected' 
                ? "Qboid Connected" 
                : connectionStatus === 'connecting' 
                  ? "Awaiting Connection" 
                  : "Configure Qboid WiFi API"
            }
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
};
