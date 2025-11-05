import { useState, useEffect } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePickWaves } from "@/hooks/usePickWaves";
import { Badge } from "@/components/ui/badge";
import { Layers, RefreshCw, Play, User } from "lucide-react";
import { toast } from "sonner";

export default function PickWaves() {
  const { waves, loading, fetchWaves, releaseWave, assignWave } = usePickWaves();
  const [selectedStatus, setSelectedStatus] = useState<string>('created');

  useEffect(() => {
    fetchWaves(selectedStatus);
  }, [selectedStatus]);

  const handleRefresh = async () => {
    await fetchWaves(selectedStatus);
    toast.success("Pick waves refreshed");
  };

  const handleRelease = async (waveId: string) => {
    try {
      await releaseWave(waveId);
      await fetchWaves(selectedStatus);
      toast.success("Wave released successfully");
    } catch (error) {
      toast.error("Failed to release wave");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "outline",
      released: "default",
      in_progress: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Pick Waves
            </h1>
            <p className="text-muted-foreground">Manage and monitor batch picking operations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {['created', 'released', 'in_progress', 'completed'].map(status => (
            <Button
              key={status}
              variant={selectedStatus === status ? "default" : "outline"}
              onClick={() => setSelectedStatus(status)}
            >
              {status.replace('_', ' ').toUpperCase()}
            </Button>
          ))}
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : waves.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mb-4 opacity-20" />
                <p>No {selectedStatus} pick waves found</p>
              </CardContent>
            </Card>
          ) : (
            waves.map((wave) => (
              <Card key={wave.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {wave.wave_number}
                        {getStatusBadge(wave.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Strategy: {wave.pick_strategy} | Priority: {wave.priority}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {wave.status === 'created' && (
                        <Button onClick={() => handleRelease(wave.id)} size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Release
                        </Button>
                      )}
                      {wave.assigned_to && (
                        <Button variant="outline" size="sm">
                          <User className="h-4 w-4 mr-2" />
                          Assigned
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Orders</p>
                      <p className="text-lg font-semibold">{wave.total_orders || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pick Lines</p>
                      <p className="text-lg font-semibold">{wave.total_picks || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="text-lg font-semibold">{wave.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-lg font-semibold">
                        {wave.created_at ? new Date(wave.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </TmsLayout>
  );
}
