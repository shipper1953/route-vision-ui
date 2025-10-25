import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface TrackingMapProps {
  events: any[];
  destination: {
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export const TrackingMap = ({ events, destination }: TrackingMapProps) => {
  // Get unique locations from events
  const locations = events
    .filter(e => e.location)
    .map(e => e.location)
    .filter((loc, index, self) => 
      index === self.findIndex(l => 
        l.city === loc.city && l.state === loc.state
      )
    );

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle>Package Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-muted/30 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
          {/* Simplified visual map representation */}
          <div className="space-y-6 w-full max-w-2xl">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Package Route</p>
              <div className="flex items-center justify-between">
                {locations.slice(0, 5).map((loc, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="rounded-full p-3 bg-primary/10 border-2 border-primary">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-xs text-center">
                      <p className="font-medium">{loc.city}</p>
                      <p className="text-muted-foreground">{loc.state}</p>
                    </div>
                    {idx < locations.length - 1 && (
                      <div className="h-0.5 w-16 bg-primary/30 absolute translate-x-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center pt-6 border-t">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Final Destination:</span>
                <span>{destination.city}, {destination.state} {destination.zip}</span>
              </div>
            </div>
          </div>
          
          {/* Note about full map integration */}
          <div className="absolute bottom-4 right-4">
            <p className="text-xs text-muted-foreground">
              Interactive map view coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
