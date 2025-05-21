
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { ConnectionStatusBadge } from "./package/ConnectionStatusBadge";
import { QboidButton } from "./package/QboidButton";
import { PackageStatusMessage } from "./package/PackageStatusMessage";
import { DimensionsSection } from "./package/DimensionsSection";
import { WeightSection } from "./package/WeightSection";
import { useQboidConnection } from "./package/useQboidConnection.tsx";

export const PackageDetailsSection = () => {
  const {
    configuring,
    connectionStatus,
    lastUpdateTime,
    handleConfigureQboid
  } = useQboidConnection();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Package Details</CardTitle>
            <CardDescription>Enter the package dimensions and weight</CardDescription>
          </div>
          <ConnectionStatusBadge connectionStatus={connectionStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DimensionsSection />
          <WeightSection />
        </div>
        
        <PackageStatusMessage 
          connectionStatus={connectionStatus}
          lastUpdateTime={lastUpdateTime}
        />
      </CardContent>
      
      <CardFooter>
        <QboidButton 
          connectionStatus={connectionStatus}
          configuring={configuring}
          onClick={handleConfigureQboid}
        />
      </CardFooter>
    </Card>
  );
};
