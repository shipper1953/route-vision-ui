
import { OrderData } from "@/types/orderTypes";

// Mock database of orders for demonstration purposes
// In a real application, this would be fetched from an API
const mockOrders: OrderData[] = [
  {
    id: "ORD-1234",
    customerName: "ABC Company",
    customerCompany: "ABC Inc.",
    customerPhone: "555-123-4567",
    customerEmail: "contact@abcinc.com",
    orderDate: "2025-05-15",
    requiredDeliveryDate: "2025-05-20",
    status: "ready_to_ship",
    items: 3,
    value: "$529.99",
    shippingAddress: {
      street1: "456 Commerce Ave",
      street2: "Suite 100",
      city: "Chicago",
      state: "IL",
      zip: "60607",
      country: "US"
    },
    parcelInfo: {
      length: 12,
      width: 8,
      height: 6,
      weight: 32 // 2 lbs
    }
  },
  {
    id: "ORD-1235",
    customerName: "XYZ Corp",
    customerCompany: "XYZ Corporation",
    customerPhone: "555-987-6543",
    customerEmail: "shipping@xyzcorp.com",
    orderDate: "2025-05-14",
    requiredDeliveryDate: "2025-05-22",
    status: "ready_to_ship",
    items: 1,
    value: "$129.50",
    shippingAddress: {
      street1: "789 Business Blvd",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      country: "US"
    }
  },
  {
    id: "ORD-1236",
    customerName: "Tech Solutions Inc",
    customerCompany: "Tech Solutions",
    customerPhone: "555-456-7890",
    customerEmail: "info@techsolutions.com",
    orderDate: "2025-05-13",
    requiredDeliveryDate: "2025-05-18",
    status: "ready_to_ship",
    items: 5,
    value: "$1,245.00",
    shippingAddress: {
      street1: "101 Innovation Way",
      street2: "Floor 3",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "US"
    },
    parcelInfo: {
      length: 18,
      width: 12,
      height: 10,
      weight: 64 // 4 lbs
    }
  }
];

export default mockOrders;
