
import { TmsLayout } from "@/components/layout/TmsLayout";
import { ShipmentForm } from "@/components/shipment/ShipmentForm";
import { useState, useEffect } from "react";
import { ShippingLabelDialog } from "@/components/shipment/ShippingLabelDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

const CreateShipment = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [labelData, setLabelData] = useState<any>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  // Handle successful label purchase and verify database save
  const handleLabelPurchased = async (result: any) => {
    console.log("Label purchased successfully:", result);
    setLabelData(result);
    setShowLabelDialog(true);

    if (result?.id) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: existingShipment } = await supabase
          .from('shipments')
          .select('*, company_id')
          .eq('easypost_id', result.id)
          .maybeSingle();

        if (existingShipment) {
          console.log("✅ Shipment confirmed in database:", existingShipment);
          if (existingShipment.company_id) {
            toast.success("Shipment successfully saved!");
          }
          break;
        } else if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Check fulfillment status
    if (orderId) {
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('fulfillment_status, fulfillment_percentage, items_shipped, items_total')
          .eq('id', Number(orderId))
          .single();
        
        if (orderData) {
          if (orderData.fulfillment_status === 'fulfilled') {
            toast.success(`Order fully fulfilled! All ${orderData.items_total} items shipped.`);
          } else if (orderData.fulfillment_status === 'partially_fulfilled') {
            toast.info(`Order partially fulfilled: ${orderData.items_shipped}/${orderData.items_total} items shipped (${orderData.fulfillment_percentage?.toFixed(0)}%)`);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch fulfillment status:', err);
      }
    }
  };

  const handleDialogClose = () => {
    setShowLabelDialog(false);
    if (orderId) {
      navigate(`/orders?highlight=${orderId}`);
    } else {
      navigate('/orders');
    }
  };

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create Shipment</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Create a new shipment with SmartRate</p>
            {orderId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Order: {orderId}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ShipmentForm onLabelPurchased={handleLabelPurchased} />

      <ShippingLabelDialog
        isOpen={showLabelDialog}
        onClose={handleDialogClose}
        labelUrl={labelData?.labelUrl || labelData?.postage_label?.label_url || labelData?.label_url}
        shipmentId={labelData?.shipmentId?.toString() || labelData?.object_id || labelData?.id || ''}
        orderDetails={labelData ? {
          carrier: labelData.carrier || labelData.selected_rate?.carrier || labelData.rate?.provider || 'Unknown',
          service: labelData.service || labelData.selected_rate?.service || labelData.rate?.servicelevel?.name || labelData.servicelevel?.name || 'Unknown',
          trackingCode: labelData.trackingNumber || labelData.tracking_code || labelData.tracking_number || 'N/A',
          trackingUrl: labelData.trackingUrl || labelData.tracker?.public_url || labelData.tracking_url_provider || '',
          createdAt: new Date().toLocaleString()
        } : undefined}
      />
    </TmsLayout>
  );
};

export default CreateShipment;
