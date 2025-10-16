
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { CartonizationSettings } from "@/components/settings/CartonizationSettings";
import { BoxInventoryManager } from "@/components/cartonization/BoxInventoryManager";
import { CartonizationTestingEnvironment } from "@/components/cartonization/CartonizationTestingEnvironment";
import { PackagingAlgorithm } from "@/components/cartonization/PackagingAlgorithm";
import { BoxRecommendations } from "@/components/cartonization/BoxRecommendations";
import { HistoricalBoxUsageSimplified } from "@/components/packaging/HistoricalBoxUsageSimplified";
import { PrintNodeSettings } from "@/components/settings/PrintNodeSettings";
import { useCartonization } from "@/hooks/useCartonization";

interface PendingBoxData {
  name: string;
  sku: string;
  length: number;
  width: number;
  height: number;
  cost: number;
  box_type: 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom';
  max_weight?: number;
  in_stock?: number;
  min_stock?: number;
  max_stock?: number;
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'box-recommendations';
  const { boxes, setBoxes, parameters, updateParameters } = useCartonization();
  const [pendingBoxData, setPendingBoxData] = useState<PendingBoxData | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleAddToInventory = (boxData: PendingBoxData) => {
    setPendingBoxData(boxData);
    setSearchParams({ tab: 'box-inventory' });
  };

  const handleInitialDataConsumed = () => {
    setPendingBoxData(null);
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1">
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
            <TabsTrigger value="printer" className="text-xs sm:text-sm whitespace-nowrap px-2 py-2">
              Printer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="historical-usage" className="space-y-4">
            <HistoricalBoxUsageSimplified />
          </TabsContent>
          
          <TabsContent value="box-inventory" className="space-y-4">
            <BoxInventoryManager 
              initialBoxData={pendingBoxData}
              onInitialDataConsumed={handleInitialDataConsumed}
            />
          </TabsContent>
          
          <TabsContent value="box-recommendations" className="space-y-4">
            <BoxRecommendations onAddToInventory={handleAddToInventory} />
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
          
          <TabsContent value="printer" className="space-y-4">
            <PrintNodeSettings />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default Settings;
