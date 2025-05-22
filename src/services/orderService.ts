
// Types for Order data
export interface OrderAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ParcelInfo {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface OrderData {
  id: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderDate: string;
  requiredDeliveryDate: string;
  status: string;
  items: number;
  value: string;
  shippingAddress: OrderAddress;
  parcelInfo?: ParcelInfo; // This would come from the Qboid scanning system
}

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
    status: "processing",
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

/**
 * Fetches an order by its ID
 * @param orderId The ID of the order to fetch
 * @returns The order data or null if not found
 */
export async function fetchOrderById(orderId: string): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real application, this would make an API call to your backend
  const order = mockOrders.find(order => order.id === orderId);
  
  // Simulate Qboid data population (would come from a separate system in reality)
  // This is where the scanning system would have populated parcel dimensions
  
  if (!order) {
    return null;
  }
  
  // Return a copy of the order to avoid mutation
  return {...order};
}

/**
 * Fetches all orders
 * @returns An array of order data
 */
export async function fetchOrders(): Promise<OrderData[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return a copy of orders to avoid mutation
  return [...mockOrders];
}

/**
 * Creates a new order
 * @param orderData The order data to create
 * @returns The created order
 */
export async function createOrder(orderData: Omit<OrderData, 'id'>): Promise<OrderData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Generate a new order ID
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Create the new order with the generated ID
  const newOrder: OrderData = {
    ...orderData,
    id: orderId
  };
  
  // Add to our mock database
  mockOrders.push(newOrder);
  
  // Return a copy of the new order
  return {...newOrder};
}

/**
 * Updates an order with shipment information
 * @param orderId The ID of the order to update
 * @param shipmentId The ID of the associated shipment
 * @param trackingCode The tracking code for the shipment
 * @returns The updated order or null if not found
 */
export async function updateOrderWithShipment(
  orderId: string,
  shipmentId: string,
  trackingCode: string
): Promise<OrderData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // In a real application, this would make an API call to update the order
  const orderIndex = mockOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return null;
  }
  
  // Update the order status
  mockOrders[orderIndex].status = "shipped";
  
  // In a real app, you would also associate the shipment ID and tracking code
  
  // Return a copy of the updated order
  return {...mockOrders[orderIndex]};
}

export default {
  fetchOrderById,
  fetchOrders,
  createOrder,
  updateOrderWithShipment
};
