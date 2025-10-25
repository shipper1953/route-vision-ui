import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MapPin, CheckCircle2, Clock, AlertTriangle, Truck } from "lucide-react";

interface TrackingEvent {
  event_type: string;
  status: string;
  status_detail: string;
  message: string;
  location: {
    city: string;
    state: string;
    country: string;
  } | null;
  carrier_timestamp: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
}

export const TrackingTimeline = ({ events }: TrackingTimelineProps) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'out_for_delivery':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'in_transit':
        return <Package className="h-5 w-5 text-primary" />;
      case 'exception':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  if (!events || events.length === 0) {
    return (
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Tracking Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tracking events available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle>Tracking Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {events.map((event, index) => {
            const datetime = formatDate(event.carrier_timestamp);
            const isLast = index === events.length - 1;
            
            return (
              <div key={`${event.carrier_timestamp}-${index}`} className="flex gap-4">
                {/* Icon and line */}
                <div className="flex flex-col items-center">
                  <div className="rounded-full p-2 bg-card border-2 border-border">
                    {getEventIcon(event.event_type)}
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold capitalize">
                        {event.event_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.message || event.status_detail || event.status}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{datetime.time}</p>
                      <p className="text-muted-foreground">{datetime.date}</p>
                    </div>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {event.location.city}, {event.location.state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
