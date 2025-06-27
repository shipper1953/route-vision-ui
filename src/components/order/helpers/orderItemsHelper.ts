
import { OrderItem } from "@/types/orderTypes";

export const renderOrderItems = (items: OrderItem[] | number) => {
  if (typeof items === 'number') {
    return `${items} items`;
  }
  
  if (Array.isArray(items)) {
    return `${items.length} items`;
  }
  
  return '0 items';
};
