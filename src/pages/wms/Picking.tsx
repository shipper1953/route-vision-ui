import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Package, Users, TrendingUp, Plus } from "lucide-react";

export default function Picking() {
  const pickWaves = [
    { id: 1, waveNumber: "WAVE-001", orders: 45, picks: 187, status: "in_progress", priority: "high", assignedTo: "John D." },
    { id: 2, waveNumber: "WAVE-002", orders: 32, picks: 124, status: "created", priority: "medium", assignedTo: null },
    { id: 3, waveNumber: "WAVE-003", orders: 28, picks: 98, status: "completed", priority: "low", assignedTo: "Sarah M." },
  ];

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Picking & Fulfillment</h1>
            <p className="text-muted-foreground">Manage pick waves and order fulfillment</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Wave
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Waves</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Pending picks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Pickers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">On the floor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.6%</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pick Waves</CardTitle>
            <CardDescription>Active and pending pick waves</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pickWaves.map((wave) => (
                <div key={wave.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wave.waveNumber}</span>
                      <Badge variant={
                        wave.status === "completed" ? "default" :
                        wave.status === "in_progress" ? "secondary" :
                        "outline"
                      }>
                        {wave.status.replace("_", " ")}
                      </Badge>
                      <Badge variant={
                        wave.priority === "high" ? "destructive" :
                        wave.priority === "medium" ? "secondary" :
                        "outline"
                      }>
                        {wave.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {wave.orders} orders • {wave.picks} picks
                    </p>
                    {wave.assignedTo && (
                      <p className="text-xs text-muted-foreground">Assigned to: {wave.assignedTo}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {wave.status === "created" && (
                      <Button>Release Wave</Button>
                    )}
                    {wave.status === "in_progress" && (
                      <Button variant="outline">View Progress</Button>
                    )}
                    {wave.status === "completed" && (
                      <Button variant="outline">View Report</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
}
