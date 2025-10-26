import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function Quality() {
  const inspections = [
    { id: 1, inspectionNumber: "QC-2024-001", itemSku: "SKU-12345", quantity: 100, status: "pending", priority: "high" },
    { id: 2, inspectionNumber: "QC-2024-002", itemSku: "SKU-67890", quantity: 50, status: "in_progress", priority: "medium" },
    { id: 3, inspectionNumber: "QC-2024-003", itemSku: "SKU-11223", quantity: 75, status: "passed", priority: "low" },
  ];

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quality Control</h1>
            <p className="text-muted-foreground">Manage inspections and quality checks</p>
          </div>
          <Button>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            New Inspection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Awaiting inspection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Being inspected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">97.8%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inspection Queue</CardTitle>
            <CardDescription>Items awaiting quality inspection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{inspection.inspectionNumber}</span>
                      <Badge variant={
                        inspection.status === "passed" ? "default" :
                        inspection.status === "in_progress" ? "secondary" :
                        "outline"
                      }>
                        {inspection.status.replace("_", " ")}
                      </Badge>
                      <Badge variant={
                        inspection.priority === "high" ? "destructive" :
                        inspection.priority === "medium" ? "secondary" :
                        "outline"
                      }>
                        {inspection.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">SKU: {inspection.itemSku}</p>
                    <p className="text-xs text-muted-foreground">Quantity: {inspection.quantity}</p>
                  </div>
                  <Button 
                    variant={inspection.status === "pending" ? "default" : "outline"}
                    disabled={inspection.status === "passed"}
                  >
                    {inspection.status === "pending" ? "Start Inspection" : 
                     inspection.status === "in_progress" ? "Continue" : "View Results"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
}
