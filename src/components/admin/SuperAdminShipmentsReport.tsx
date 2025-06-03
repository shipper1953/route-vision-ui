

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Loader2, DollarSign, TrendingUp, Package } from "lucide-react";

interface ShipmentReport {
  id: string;
  easypost_id: string;
  tracking_number: string;
  carrier: string;
  service: string;
  status: string;
  cost: number;
  original_cost: number;
  profit: number;
  created_at: string;
  company_name: string;
  company_id: string;
}

interface CompanySummary {
  company_id: string;
  company_name: string;
  total_shipments: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

export const SuperAdminShipmentsReport = () => {
  const [shipments, setShipments] = useState<ShipmentReport[]>([]);
  const [companySummaries, setCompanySummaries] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchShipmentsReport();
  }, []);

  const fetchShipmentsReport = async () => {
    try {
      setLoading(true);

      // Create a service role client to bypass RLS
      const supabaseUrl = 'https://gidrlosmhpvdcogrkidj.supabase.co';
      const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHJsb3NtaHB2ZGNvZ3JraWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI5MzMzMiwiZXhwIjoyMDYyODY5MzMyfQ.YyOFE3CdP2kK5GVMKJayMRNJh6kYvZo1P_4_OqTgGgs';
      
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      console.log("Fetching ALL shipments using service role...");

      // Get ALL shipments using service role to bypass RLS
      const { data: shipmentsData, error: shipmentsError } = await serviceClient
        .from('shipments')
        .select('*')
        .not('cost', 'is', null)
        .order('created_at', { ascending: false });

      console.log("Service role shipments query result:", { data: shipmentsData, error: shipmentsError });

      if (shipmentsError) throw shipmentsError;

      if (!shipmentsData?.length) {
        console.log("No shipments found");
        setShipments([]);
        setCompanySummaries([]);
        return;
      }

      // Get all companies for lookup
      const { data: companiesData, error: companiesError } = await serviceClient
        .from('companies')
        .select('id, name, markup_type, markup_value');

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
      }

      const companyMap = new Map(companiesData?.map(c => [c.id, c]) || []);

      // Get all users to link shipments to companies through user_id
      const { data: usersData, error: usersError } = await serviceClient
        .from('users')
        .select('id, company_id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      const userCompanyMap = new Map(usersData?.map(u => [u.id, u.company_id]) || []);

      // Process shipments data to calculate original cost and profit
      const processedShipments: ShipmentReport[] = shipmentsData.map(shipment => {
        // Get company info - either directly from shipment.company_id or through user relationship
        let companyData = null;
        let companyId = null;
        let companyName = 'No Company';

        if (shipment.company_id) {
          // Direct company_id on shipment
          companyId = shipment.company_id;
          companyData = companyMap.get(companyId);
          companyName = companyData?.name || 'Unknown Company';
        } else if (shipment.user_id) {
          // Get company through user relationship
          companyId = userCompanyMap.get(shipment.user_id);
          if (companyId) {
            companyData = companyMap.get(companyId);
            companyName = companyData?.name || 'Unknown Company';
          } else {
            companyName = 'No Company';
          }
        } else {
          companyName = 'No Company';
        }
        
        // Calculate original cost based on markup (reverse calculation)
        let originalCost = shipment.cost;
        let profit = 0;

        if (companyData?.markup_type && companyData?.markup_value) {
          if (companyData.markup_type === 'percentage') {
            originalCost = shipment.cost / (1 + (companyData.markup_value / 100));
          } else if (companyData.markup_type === 'fixed') {
            originalCost = shipment.cost - companyData.markup_value;
          }
          profit = shipment.cost - originalCost;
        }

        return {
          id: String(shipment.id),
          easypost_id: shipment.easypost_id || '',
          tracking_number: shipment.tracking_number || '',
          carrier: shipment.carrier,
          service: shipment.service,
          status: shipment.status,
          cost: shipment.cost,
          original_cost: originalCost,
          profit: profit,
          created_at: shipment.created_at,
          company_name: companyName,
          company_id: String(companyId || 'none')
        };
      });

      console.log(`Processed ${processedShipments.length} shipments`);
      setShipments(processedShipments);

      // Calculate company summaries
      const summaryMap = new Map<string, CompanySummary>();
      
      processedShipments.forEach(shipment => {
        const key = shipment.company_id !== 'none' ? shipment.company_id : 'none';
        if (summaryMap.has(key)) {
          const summary = summaryMap.get(key)!;
          summary.total_shipments += 1;
          summary.total_revenue += shipment.cost;
          summary.total_cost += shipment.original_cost;
          summary.total_profit += shipment.profit;
        } else {
          summaryMap.set(key, {
            company_id: shipment.company_id,
            company_name: shipment.company_name,
            total_shipments: 1,
            total_revenue: shipment.cost,
            total_cost: shipment.original_cost,
            total_profit: shipment.profit
          });
        }
      });

      setCompanySummaries(Array.from(summaryMap.values()));
    } catch (error) {
      console.error('Error fetching shipments report:', error);
      toast.error('Failed to load shipments report');
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = selectedCompany === 'all' 
    ? shipments 
    : shipments.filter(s => s.company_id === selectedCompany);

  const uniqueCompanies = Array.from(new Set(shipments.map(s => ({ id: s.company_id, name: s.company_name }))))
    .filter(c => c.id && c.id !== 'none');

  const totalMetrics = {
    shipments: filteredShipments.length,
    revenue: filteredShipments.reduce((sum, s) => sum + s.cost, 0),
    cost: filteredShipments.reduce((sum, s) => sum + s.original_cost, 0),
    profit: filteredShipments.reduce((sum, s) => sum + s.profit, 0)
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading shipments report...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.shipments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMetrics.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMetrics.cost.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalMetrics.profit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <Select value={viewMode} onValueChange={(value: 'detailed' | 'summary') => setViewMode(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detailed">Detailed View</SelectItem>
            <SelectItem value="summary">Company Summary</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="none">No Company</SelectItem>
            {uniqueCompanies.map(company => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={fetchShipmentsReport} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'detailed' ? 'Shipments Report' : 'Company Summary Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'detailed' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Base Cost</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-mono text-sm">
                      {shipment.tracking_number || shipment.easypost_id}
                    </TableCell>
                    <TableCell>{shipment.company_name}</TableCell>
                    <TableCell>{shipment.carrier}</TableCell>
                    <TableCell>{shipment.service}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        shipment.status === 'purchased' ? 'bg-green-100 text-green-800' :
                        shipment.status === 'created' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {shipment.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(shipment.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${shipment.original_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${shipment.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      ${shipment.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Shipments</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                  <TableHead className="text-right">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companySummaries
                  .filter(summary => selectedCompany === 'all' || summary.company_id === selectedCompany)
                  .sort((a, b) => b.total_profit - a.total_profit)
                  .map((summary) => (
                  <TableRow key={summary.company_id}>
                    <TableCell className="font-medium">{summary.company_name}</TableCell>
                    <TableCell className="text-right">{summary.total_shipments}</TableCell>
                    <TableCell className="text-right">${summary.total_revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${summary.total_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      ${summary.total_profit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {summary.total_revenue > 0 ? 
                        `${((summary.total_profit / summary.total_revenue) * 100).toFixed(1)}%` : 
                        '0%'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

