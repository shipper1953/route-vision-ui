
import { useAuth } from "@/hooks/useAuth";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyProfile } from "@/components/admin/CompanyProfile";
import { WarehouseManagement } from "@/components/admin/WarehouseManagement";
import { WalletManagement } from "@/components/admin/WalletManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanyAdminPanel = () => {
  const { isAuthenticated, isCompanyAdmin, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isCompanyAdmin)) {
      navigate('/login');
    }
  }, [isAuthenticated, isCompanyAdmin, loading, navigate]);

  // Confirm Stripe session on return and clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');

    console.log('[CompanyAdminPanel] URL params', { success, sessionId, canceled });

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('session_id');
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    };

    if (canceled) {
      cleanUrl();
      return;
    }

    // Proceed if we have a sessionId and user profile is loaded
    if (sessionId && userProfile?.company_id && !confirmingPayment) {
      setConfirmingPayment(true);
      
      (async () => {
        try {
          console.log('[CompanyAdminPanel] Confirming Stripe session', sessionId);
          
          const { data, error } = await supabase.functions.invoke('confirm-stripe-session', {
            body: { sessionId, companyId: userProfile.company_id },
          });
          
          if (error) {
            console.error('Confirmation error:', error);
            throw error;
          }
          
          console.log('[CompanyAdminPanel] Confirmation response:', data);
          
          if (data?.credited) {
            toast.success(`Wallet credited: $${data.amount}`);
          } else if (data?.alreadyRecorded) {
            toast.info('Payment already recorded.');
          } else if (data?.amount) {
            toast.success(`Payment processed: $${data.amount}`);
          } else {
            toast.message('Payment processed.');
          }
        } catch (e) {
          console.error('Payment confirmation failed', e);
          toast.error('Payment confirmation failed');
        } finally {
          setConfirmingPayment(false);
          cleanUrl();
        }
      })();
    }
  }, [userProfile?.company_id, confirmingPayment]);

  // Fetch company orders
  const { data: companyOrders = [] } = useQuery({
    queryKey: ['company-orders', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id && isCompanyAdmin,
  });

  // Fetch company shipments
  const { data: companyShipments = [] } = useQuery({
    queryKey: ['company-shipments', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id && isCompanyAdmin,
  });

  // Show loading while checking authentication or confirming payment
  if (loading || confirmingPayment) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mx-auto mb-4"></div>
          <p>{confirmingPayment ? 'Processing payment...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not company admin
  if (!isAuthenticated || !isCompanyAdmin) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Administration</h1>
          <p className="text-muted-foreground">
            Manage your company settings, users, and operations
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="orders">Company Orders</TabsTrigger>
            <TabsTrigger value="shipments">Company Shipments</TabsTrigger>
            <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
            <TabsTrigger value="wallet">Wallet & Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <CompanyProfile companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Company Orders</CardTitle>
                <CardDescription>
                  All orders placed by your company ({companyOrders.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companyOrders.length === 0 ? (
                    <p className="text-muted-foreground">No orders found for your company.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">Order ID</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Customer</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Value</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyOrders.map((order) => (
                            <tr key={order.id}>
                              <td className="border border-gray-200 px-4 py-2">{order.order_id}</td>
                              <td className="border border-gray-200 px-4 py-2">{order.customer_name || 'N/A'}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  {order.status}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">${order.value}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipments">
            <Card>
              <CardHeader>
                <CardTitle>Company Shipments</CardTitle>
                <CardDescription>
                  All shipments created by your company ({companyShipments.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companyShipments.length === 0 ? (
                    <p className="text-muted-foreground">No shipments found for your company.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">Shipment ID</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Carrier</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Service</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Cost</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Tracking</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyShipments.map((shipment) => (
                            <tr key={shipment.id}>
                              <td className="border border-gray-200 px-4 py-2">{shipment.id}</td>
                              <td className="border border-gray-200 px-4 py-2">{shipment.carrier}</td>
                              <td className="border border-gray-200 px-4 py-2">{shipment.service}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                  {shipment.status}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                ${shipment.cost ? Number(shipment.cost).toFixed(2) : 'N/A'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2">{shipment.tracking_number || 'N/A'}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                {new Date(shipment.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="warehouses">
            <WarehouseManagement companyId={userProfile?.company_id} />
          </TabsContent>
          
          <TabsContent value="wallet">
            <WalletManagement companyId={userProfile?.company_id} />
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default CompanyAdminPanel;
