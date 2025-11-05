import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePicking } from "@/hooks/usePicking";
import { PickListCard } from "@/components/wms/picking/PickListCard";
import { PickingInterface } from "@/components/wms/picking/PickingInterface";
import { Package, List, RefreshCw } from "lucide-react";

export default function Picking() {
  const {
    pickLists,
    currentSession,
    loading,
    fetchPickLists,
    startPickingSession,
    pickItem,
    completePickingSession,
    cancelPickingSession
  } = usePicking();

  const [activeTab, setActiveTab] = useState('pending');

  const pendingPickLists = pickLists.filter(pl => pl.status === 'pending');
  const inProgressPickLists = pickLists.filter(pl => pl.status === 'in_progress');
  const completedPickLists = pickLists.filter(pl => pl.status === 'completed');

  if (currentSession) {
    return (
      <TmsLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Picking Session</h1>
            <p className="text-muted-foreground">
              Scan items to complete the pick list
            </p>
          </div>

          <PickingInterface
            session={currentSession}
            onPickItem={pickItem}
            onComplete={completePickingSession}
            onCancel={cancelPickingSession}
          />
        </div>
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Picking & Packing</h1>
            <p className="text-muted-foreground">
              Manage pick lists and picking operations
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchPickLists()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <List className="h-4 w-4" />
              Pending ({pendingPickLists.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-2">
              <Package className="h-4 w-4" />
              In Progress ({inProgressPickLists.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed ({completedPickLists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingPickLists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending pick lists
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingPickLists.map(pickList => (
                  <PickListCard
                    key={pickList.id}
                    pickList={pickList}
                    onStart={startPickingSession}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
            {inProgressPickLists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pick lists in progress
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {inProgressPickLists.map(pickList => (
                  <PickListCard
                    key={pickList.id}
                    pickList={pickList}
                    onStart={startPickingSession}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPickLists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No completed pick lists
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedPickLists.map(pickList => (
                  <PickListCard
                    key={pickList.id}
                    pickList={pickList}
                    onStart={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
}
