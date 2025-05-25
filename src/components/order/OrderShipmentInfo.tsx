
import { OrderData } from "@/types/orderTypes";
import { Truck, Package, Calendar, CalendarCheck, ExternalLink, DollarSign } from "lucide-react";

interface ShipmentInfoProps {
  shipment?: OrderData['shipment'];
}

export const OrderShipmentInfo = ({ shipment }: ShipmentInfoProps) => {
  if (!shipment) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Truck size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium">{shipment.carrier} {shipment.service}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Package size={14} className="text-muted-foreground" />
        <a 
          href={shipment.trackingUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          {shipment.trackingNumber}
          <ExternalLink size={12} />
        </a>
      </div>
      
      {shipment.cost && (
        <div className="flex items-center gap-1">
          <DollarSign size={14} className="text-muted-foreground" />
          <span className="text-sm">${parseFloat(shipment.cost.toString()).toFixed(2)}</span>
        </div>
      )}
      
      {shipment.estimatedDeliveryDate && (
        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-sm">Est: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span>
        </div>
      )}
      
      {shipment.actualDeliveryDate && (
        <div className="flex items-center gap-1">
          <CalendarCheck size={14} className="text-muted-foreground" />
          <span className="text-sm text-green-600 font-medium">
            Delivered: {new Date(shipment.actualDeliveryDate).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};
