
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { CartonizationSettings } from "@/components/settings/CartonizationSettings";
import { BoxInventoryManager } from "@/components/cartonization/BoxInventoryManager";
import { CartonizationTestingEnvironment } from "@/components/cartonization/CartonizationTestingEnvironment";
import { PackagingAlgorithm } from "@/components/cartonization/PackagingAlgorithm";
import { BoxRecommendations } from "@/components/cartonization/BoxRecommendations";
import { HistoricalBoxUsageSimplified } from "@/components/packaging/HistoricalBoxUsageSimplified";
import { useCartonization } from "@/hooks/useCartonization";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'box-recommendations';
  const { boxes, setBoxes, parameters, updateParameters } = useCartonization();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  console.log('Settings - activeTab:', activeTab);
  console.log('Settings - parameters:', parameters);

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Tornado Pack</h1>
          <p className="text-muted-foreground">
            Smart packaging recommendations and inventory management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="historical-usage" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Historical
            </TabsTrigger>
            <TabsTrigger value="box-inventory" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="box-recommendations" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="packaging-rules" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Rules
            </TabsTrigger>
            <TabsTrigger value="testing" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Testing
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="historical-usage" className="space-y-4">
            <HistoricalBoxUsageSimplified />
          </TabsContent>
          
          <TabsContent value="box-inventory" className="space-y-4">
            <BoxInventoryManager />
          </TabsContent>
          
          <TabsContent value="box-recommendations" className="space-y-4">
            <BoxRecommendations />
          </TabsContent>
          
          <TabsContent value="packaging-rules" className="space-y-4">
            <div className="p-4 border rounded-lg bg-background">
              <h3 className="text-lg font-semibold mb-4">Packaging Algorithm Configuration</h3>
              <PackagingAlgorithm 
                parameters={parameters}
                onParametersChange={updateParameters}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="testing" className="space-y-4">
            <CartonizationTestingEnvironment />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default Settings;
