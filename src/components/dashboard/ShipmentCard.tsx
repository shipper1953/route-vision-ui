
import { cn } from "@/lib/utils";

interface ShipmentCardProps {
  shipment: {
    id: string;
    title: string;
    origin: string;
    destination: string;
    date: string;
    status: "in_transit" | "delivered" | "pending" | "canceled";
    client: string;
  };
  className?: string;
}

export function ShipmentCard({ shipment, className }: ShipmentCardProps) {
  const statusMap = {
    in_transit: { label: "In Transit", class: "tms-badge-blue" },
    delivered: { label: "Delivered", class: "tms-badge-green" },
    pending: { label: "Pending", class: "tms-badge-amber" },
    canceled: { label: "Canceled", class: "bg-red-100 text-red-800" },
  };
  
  const status = statusMap[shipment.status];

  return (
    <div className={cn("tms-card", className)}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold">{shipment.title}</h3>
        <span className={cn("tms-badge", status.class)}>{status.label}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Origin:</div>
          <div className="font-medium">{shipment.origin}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Destination:</div>
          <div className="font-medium">{shipment.destination}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Date:</div>
          <div className="font-medium">{shipment.date}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Client:</div>
          <div className="font-medium">{shipment.client}</div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-border flex justify-end">
        <button className="text-sm text-tms-blue hover:text-tms-blue-400 font-medium">
          View Details
        </button>
      </div>
    </div>
  );
}
