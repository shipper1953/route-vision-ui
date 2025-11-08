import { useState, useEffect } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageOpen, Calendar, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchPurchaseOrders();
    }
  }, [userProfile?.company_id]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .select('*, customers(*), po_line_items(*)')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground mt-1">Manage incoming inventory</p>
          </div>
          <Button onClick={() => navigate('/wms/receiving')}>
            <PackageOpen className="mr-2 h-4 w-4" />
            Start Receiving
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{po.po_number}</CardTitle>
                    <Badge>{po.status.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {po.vendor_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{po.vendor_name}</span>
                    </div>
                  )}
                  {po.expected_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(po.expected_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {po.status !== 'received' && (
                    <Button className="w-full" size="sm" onClick={() => navigate('/wms/receiving')}>
                      <PackageOpen className="mr-2 h-4 w-4" />
                      Start Receiving
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TmsLayout>
  );
};

export default PurchaseOrders;
