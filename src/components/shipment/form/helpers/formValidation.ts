
import { ShipmentForm } from "@/types/shipment";
import { toast } from "sonner";

export function validatePackageDimensions(data: ShipmentForm): boolean {
  if (data.length <= 0 || data.width <= 0 || data.height <= 0 || data.weight <= 0) {
    toast.error("Package dimensions and weight must be greater than 0");
    return false;
  }
  return true;
}
