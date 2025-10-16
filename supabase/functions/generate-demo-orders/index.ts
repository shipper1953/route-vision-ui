import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample data for random generation
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary', 'Christopher', 'Jennifer', 'Daniel', 'Patricia', 'Matthew', 'Linda', 'Anthony', 'Barbara', 'Donald', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const companies = ['ABC Corp', 'XYZ Industries', 'Tech Solutions', 'Global Enterprises', 'Innovate Inc', 'Prime Distributors', 'Elite Trading', 'Summit Group', 'Apex Partners', 'Nexus Holdings'];
const streets = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm Blvd', '654 Maple Dr', '987 Cedar Ln', '147 Birch Way', '258 Willow Ct', '369 Spruce Pl', '741 Ash Cir'];
const cities = [
  { name: 'New York', state: 'NY', zip: '10001' },
  { name: 'Los Angeles', state: 'CA', zip: '90001' },
  { name: 'Chicago', state: 'IL', zip: '60601' },
  { name: 'Houston', state: 'TX', zip: '77001' },
  { name: 'Phoenix', state: 'AZ', zip: '85001' },
  { name: 'Philadelphia', state: 'PA', zip: '19019' },
  { name: 'San Antonio', state: 'TX', zip: '78201' },
  { name: 'San Diego', state: 'CA', zip: '92101' },
  { name: 'Dallas', state: 'TX', zip: '75201' },
  { name: 'Austin', state: 'TX', zip: '78701' },
];

const statuses = ['processing', 'ready_to_ship'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateOrderId(): string {
  return `ORD-${randomInt(1000, 9999)}`;
}

function generateDeliveryDate(): string {
  const dates = [
    '2025-10-17',
    '2025-10-18',
    '2025-10-19',
    '2025-10-20',
    '2025-10-21',
    '2025-10-22',
    '2025-10-23',
    '2025-10-24',
    '2025-10-25',
  ];
  return randomElement(dates);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get Demo company
    const { data: demoCompany, error: companyError } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('name', 'Demo')
      .eq('is_active', true)
      .single();

    if (companyError || !demoCompany) {
      throw new Error('Demo company not found');
    }

    console.log('Found Demo company:', demoCompany.id);

    // Get a user from Demo company
    const { data: demoUser, error: userError } = await supabaseClient
      .from('users')
      .select('id, warehouse_ids')
      .eq('company_id', demoCompany.id)
      .limit(1)
      .single();

    if (userError || !demoUser) {
      throw new Error('No user found for Demo company');
    }

    console.log('Found Demo user:', demoUser.id);

    // Get Demo company items
    const { data: items, error: itemsError } = await supabaseClient
      .from('items')
      .select('*')
      .eq('company_id', demoCompany.id)
      .eq('is_active', true);

    if (itemsError || !items || items.length === 0) {
      throw new Error('No items found for Demo company');
    }

    console.log(`Found ${items.length} items for Demo company`);

    // Get warehouse ID
    const warehouseIds = Array.isArray(demoUser.warehouse_ids) ? demoUser.warehouse_ids : [];
    let warehouseId = warehouseIds.length > 0 ? warehouseIds[0] : null;

    if (!warehouseId) {
      const { data: defaultWarehouse } = await supabaseClient
        .from('warehouses')
        .select('id')
        .eq('company_id', demoCompany.id)
        .eq('is_default', true)
        .single();

      warehouseId = defaultWarehouse?.id || null;
    }

    console.log('Using warehouse:', warehouseId);

    // Generate 50 orders
    const orders = [];
    const usedOrderIds = new Set();

    for (let i = 0; i < 50; i++) {
      // Generate unique order ID
      let orderId: string;
      do {
        orderId = generateOrderId();
      } while (usedOrderIds.has(orderId));
      usedOrderIds.add(orderId);

      // Random customer
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const customerName = `${firstName} ${lastName}`;
      const customerCompany = Math.random() > 0.3 ? randomElement(companies) : null;
      const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const customerPhone = `${randomInt(200, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;

      // Random address
      const city = randomElement(cities);
      const shippingAddress = {
        street1: randomElement(streets),
        street2: Math.random() > 0.7 ? `Suite ${randomInt(100, 999)}` : null,
        city: city.name,
        state: city.state,
        zip: city.zip,
        country: 'US'
      };

      // Random items (1-5 items)
      const numItems = randomInt(1, 5);
      const orderItems = [];
      let totalValue = 0;

      for (let j = 0; j < numItems; j++) {
        const item = randomElement(items);
        const quantity = randomInt(1, 3);
        const unitPrice = randomPrice(5, 200);
        totalValue += unitPrice * quantity;

        orderItems.push({
          itemId: item.id,
          quantity,
          unitPrice,
          name: item.name,
          sku: item.sku,
          dimensions: {
            length: Number(item.length),
            width: Number(item.width),
            height: Number(item.height),
            weight: Number(item.weight)
          }
        });
      }

      // Round total value to 2 decimals
      totalValue = Math.round(totalValue * 100) / 100;

      const order = {
        order_id: orderId,
        customer_name: customerName,
        customer_company: customerCompany,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        order_date: '2025-10-16',
        required_delivery_date: generateDeliveryDate(),
        status: randomElement(statuses),
        items: orderItems,
        value: totalValue,
        shipping_address: shippingAddress,
        user_id: demoUser.id,
        company_id: demoCompany.id,
        warehouse_id: warehouseId
      };

      orders.push(order);
    }

    console.log(`Generated ${orders.length} orders, inserting into database...`);

    // Insert all orders
    const { data: insertedOrders, error: insertError } = await supabaseClient
      .from('orders')
      .insert(orders)
      .select();

    if (insertError) {
      console.error('Error inserting orders:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedOrders.length} orders`);

    return new Response(
      JSON.stringify({
        success: true,
        ordersCreated: insertedOrders.length,
        message: `Successfully created ${insertedOrders.length} demo orders`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-demo-orders:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
