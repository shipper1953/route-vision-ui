import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useShopifySyncLogs } from "@/hooks/useShopifySyncLogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter } from "lucide-react";

interface ShopifySyncLogViewerProps {
  companyId?: string;
}

export const ShopifySyncLogViewer = ({ companyId }: ShopifySyncLogViewerProps) => {
  const { logs, loading } = useShopifySyncLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.shopify_order_id?.includes(searchTerm) ||
      log.ship_tornado_order_id?.toString().includes(searchTerm);
    const matchesType = filterType === "all" || log.sync_type === filterType;
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      success: "default",
      failed: "destructive",
      pending: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Logs</CardTitle>
        <CardDescription>
          View synchronization history between Shopify and Ship Tornado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="order_import">Order Import</SelectItem>
              <SelectItem value="fulfillment_update">Fulfillment</SelectItem>
              <SelectItem value="inventory_sync">Inventory</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shopify Order</TableHead>
                <TableHead>Ship Tornado Order</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading sync logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sync logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.sync_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.direction}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.shopify_order_id || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ship_tornado_order_id || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredLogs.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
        )}
      </CardContent>
    </Card>
  );
};
