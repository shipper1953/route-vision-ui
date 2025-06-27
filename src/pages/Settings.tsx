
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { CartonizationSettings } from "@/components/settings/CartonizationSettings";
import { BoxInventoryManager } from "@/components/cartonization/BoxInventoryManager";
import { CartonizationTestingEnvironment } from "@/components/cartonization/CartonizationTestingEnvironment";
import { PackagingAlgorithm } from "@/components/cartonization/PackagingAlgorithm";
import { BoxRecommendations } from "@/components/cartonization/BoxRecommendations";
import { useCartonization } from "@/hooks/useCartonization";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'box-demand';
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="box-demand">Box Demand Planning</TabsTrigger>
            <TabsTrigger value="historical-usage">Historical Box Usage</TabsTrigger>
            <TabsTrigger value="box-inventory">Box Inventory Management</TabsTrigger>
            <TabsTrigger value="box-recommendations">Box Recommendations</TabsTrigger>
            <TabsTrigger value="packaging-rules">Packaging Rules</TabsTrigger>
            <TabsTrigger value="testing">Rule Testing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="box-demand" className="space-y-4">
            <CartonizationSettings />
          </TabsContent>
          
          <TabsContent value="historical-usage" className="space-y-4">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Historical Box Usage</h3>
              <p className="text-muted-foreground">Analytics and trends for box usage over time</p>
            </div>
          </TabsContent>
          
          <TabsContent value="box-inventory" className="space-y-4">
            <BoxInventoryManager 
              boxes={boxes} 
              onBoxesChange={setBoxes} 
            />
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
