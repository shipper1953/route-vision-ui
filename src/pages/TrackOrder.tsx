import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Package, CheckCircle2, Clock, AlertTriangle, Search } from "lucide-react";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { TrackingMap } from "@/components/tracking/TrackingMap";
import { PackageDetails } from "@/components/tracking/PackageDetails";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TrackOrder() {
  const { trackingNumber: urlTrackingNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(urlTrackingNumber || searchParams.get('number') || '');
  const [loading, setLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);

  const fetchTracking = async (number: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-tracking-info', {
        body: { trackingNumber: number }
      });

      if (error) throw error;
      setTrackingInfo(data);
    } catch (error: any) {
      toast.error(error.message || 'Tracking number not found');
      setTrackingInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingNumber) {
      fetchTracking(trackingNumber);
    }
  }, []);

  const handleSearch = () => {
    if (trackingNumber.trim()) {
      fetchTracking(trackingNumber.trim());
    }
  };

  const getStatusIcon = () => {
    if (!trackingInfo) return null;
    
    switch (trackingInfo.status) {
      case 'delivered':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'out_for_delivery':
        return <Package className="h-8 w-8 text-blue-600 animate-bounce" />;
      case 'exception':
        return <AlertTriangle className="h-8 w-8 text-orange-600" />;
      default:
        return <Clock className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (trackingInfo?.status) {
      case 'delivered': return 'text-green-600';
      case 'out_for_delivery': return 'text-blue-600';
      case 'exception': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Track Your Package
          </h1>
          <p className="text-muted-foreground mt-2">Real-time shipping updates</p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-8 shadow-elegant">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter tracking number..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !trackingNumber}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Track
            </Button>
          </div>
        </Card>

        {/* Tracking Info */}
        {trackingInfo && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Status Card */}
            <Card className="p-8 shadow-elegant">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon()}
                    <div>
                      <h2 className={`text-2xl font-bold capitalize ${getStatusColor()}`}>
                        {trackingInfo.status.replace('_', ' ')}
                      </h2>
                      <p className="text-muted-foreground">
                        {trackingInfo.carrier} {trackingInfo.service}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {trackingInfo.estimated_delivery && !trackingInfo.actual_delivery && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                      <p className="text-lg font-semibold">
                        {new Date(trackingInfo.estimated_delivery).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  {trackingInfo.actual_delivery && (
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-lg font-semibold text-green-600">
                        {new Date(trackingInfo.actual_delivery).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-mono text-sm">{trackingInfo.tracking_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="text-sm">
                    {trackingInfo.destination.city}, {trackingInfo.destination.state} {trackingInfo.destination.zip}
                  </p>
                </div>
              </div>
            </Card>

            {/* Map */}
            {trackingInfo.timeline?.length > 0 && (
              <TrackingMap events={trackingInfo.timeline} destination={trackingInfo.destination} />
            )}

            {/* Timeline */}
            <TrackingTimeline events={trackingInfo.timeline || []} />

            {/* Package Details */}
            {trackingInfo.order_info && (
              <PackageDetails orderInfo={trackingInfo.order_info} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
