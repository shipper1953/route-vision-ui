# API Usage Patterns

This document provides recommended patterns for common operations in Ship Tornado to ensure optimal performance and maintainability.

## Order Fetching

### Pattern: Paginated Order Fetching

**Use When**: Displaying orders in a list or table

```typescript
import { fetchOrdersPaginated } from '@/services/orderFetchPaginated';

const { orders, totalCount, hasNextPage } = await fetchOrdersPaginated(
  page,        // Current page (1-indexed)
  pageSize,    // Results per page (default: 10)
  searchTerm,  // Optional search filter
  statusFilter // Optional status filter
);
```

### Pattern: Status-Filtered Fetching

**Use When**: You need orders of a specific status

```typescript
import { fetchReadyToShipOrders } from '@/services/orderFetchService';

// Automatically paginates and stops when limit reached
const orders = await fetchReadyToShipOrders(300);
```

### Pattern: Single Order Lookup

**Use When**: Displaying order details page

```typescript
import { fetchOrderById } from '@/services/orderFetchById';

const order = await fetchOrderById(orderId);
if (!order) {
  // Handle not found
}
```

### ❌ Avoid: Full Table Fetching

```typescript
// DON'T DO THIS - Deprecated and slow
import { fetchOrders } from '@/services/orderFetchAll';
const allOrders = await fetchOrders(); // Loads 500 orders!
```

## Bulk Operations

### Pattern: Batch Processing with Concurrency

**Use When**: Processing multiple items that require API calls

```typescript
const CONCURRENCY_LIMIT = 3;
const results = [];

for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
  const batch = items.slice(i, i + CONCURRENCY_LIMIT);
  
  const batchPromises = batch.map(async (item) => {
    try {
      return await processItem(item);
    } catch (error) {
      return { ...item, error: error.message };
    }
  });
  
  const batchResults = await Promise.allSettled(batchPromises);
  
  for (const result of batchResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    }
  }
}
```

### Pattern: Batch Data Fetching

**Use When**: You need related data for multiple records

```typescript
// Fetch all addresses in one query
const { data: addressData } = await supabase
  .from('orders')
  .select('id, order_id, shipping_address')
  .in('order_id', orderIds);

// Create lookup map for O(1) access
const addressMap = new Map(
  addressData?.map(d => [d.order_id, d.shipping_address]) || []
);


// Use in processing loop
for (const order of orders) {
  const address = addressMap.get(order.id);
  // Process with address
}
```

## Cartonization

### Pattern: Reusable Engine Instance

**Use When**: Calculating boxes for multiple orders

```typescript
import { CartonizationEngine } from '@/services/cartonization/cartonizationEngine';

// Create engine once
const engine = new CartonizationEngine(boxes, {
  fillRateThreshold: 45,
  maxPackageWeight: 50,
  // ... other options
});

// Reuse for all orders
for (const order of orders) {
  const items = createItems(order);
  const result = engine.calculateOptimalBox(items);
  // Process result
}
```

### ❌ Avoid: Creating Engine Per Order

```typescript
// DON'T DO THIS - Extremely expensive
for (const order of orders) {
  const engine = new CartonizationEngine(boxes); // Rebuilds matrices every time!
  const result = engine.calculateOptimalBox(items);
}
```

## Database Queries

### Pattern: Using Database RPCs

**Use When**: You need to perform complex queries or bulk operations

```typescript
// Link multiple shipments to orders efficiently
const { data } = await supabase.rpc('link_shipments_to_orders', {
  p_order_identifiers: ['ORD-1234', 'ORD-5678', '12345'],
  p_shipment_ids: [101, 102, 103]
});

// Get qboid dimensions for multiple orders
const { data: dimensions } = await supabase.rpc('get_qboid_dimensions_for_orders', {
  p_order_identifiers: ['ORD-1234', 'ORD-5678'],
  p_days_lookback: 30
});
```

### Pattern: Narrow Projections

**Use When**: Querying any table

```typescript
// Specify only needed columns
const { data } = await supabase
  .from('orders')
  .select(`
    id,
    order_id,
    customer_name,
    status,
    items
  `)
  .eq('status', 'ready_to_ship')
  .limit(50);
```

### ❌ Avoid: SELECT *

```typescript
// DON'T DO THIS - Transfers unnecessary data
const { data } = await supabase
  .from('orders')
  .select('*'); // Fetches all columns
```

## Rate Limiting & Backoff

### Pattern: Smart Exponential Backoff

**Use When**: Making API calls that might hit rate limits

```typescript
let backoffMs = 0;
let rateLimitHit = false;

for (const item of items) {
  try {
    await processItem(item);
    
    // Reset backoff on success
    if (backoffMs > 0) {
      backoffMs = Math.max(backoffMs / 2, 0);
    }
    
  } catch (error) {
    if (error.message?.includes('429') || 
        error.message?.includes('rate-limit')) {
      rateLimitHit = true;
      
      // Exponential backoff
      backoffMs = backoffMs === 0 
        ? 2000 
        : Math.min(backoffMs * 2, 30000);
      
      console.warn(`Rate limited - backing off ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Retry the item
      continue;
    }
    
    throw error; // Re-throw non-rate-limit errors
  }
}
```

### ❌ Avoid: Fixed Delays

```typescript
// DON'T DO THIS - Wastes time even when not needed
for (const item of items) {
  await processItem(item);
  await sleep(1000); // Always waits, even if no rate limiting
}
```

## React Hooks

### Pattern: React Query for Caching

**Use When**: Fetching data that's frequently accessed

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: orders, isLoading } = useQuery({
  queryKey: ['orders', 'ready_to_ship'],
  queryFn: () => fetchReadyToShipOrders(200),
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  refetchOnWindowFocus: false,
});
```

### Pattern: Pagination Hook

**Use When**: Building paginated UI

```typescript
import { usePaginatedOrders } from '@/hooks/usePaginatedOrders';

const {
  orders,
  loading,
  currentPage,
  totalPages,
  goToPage,
  nextPage,
  previousPage,
  refreshOrders
} = usePaginatedOrders(pageSize);
```

## Performance Monitoring

### Pattern: Measure Critical Operations

**Use When**: You want to track performance of specific operations

```typescript
import { measurePerformance } from '@/utils/performanceMonitor';

const orders = await measurePerformance(
  'fetch_ready_to_ship_orders',
  async () => {
    return await fetchReadyToShipOrders(100);
  },
  { count: 100 } // Metadata
);

// In production, operations > 100ms automatically logged to analytics_events
```

### Pattern: Manual Timing

**Use When**: You need fine-grained control

```typescript
import { startPerformanceTimer, endPerformanceTimer } from '@/utils/performanceMonitor';

startPerformanceTimer('complex_calculation');

// Do work...
const result = await complexCalculation();

const duration = await endPerformanceTimer('complex_calculation', {
  itemCount: items.length,
  complexity: 'high'
});

console.log(`Operation took ${duration}ms`);
```

## Error Handling

### Pattern: Graceful Degradation

**Use When**: Fetching non-critical data

```typescript
async function loadOrders() {
  try {
    const orders = await fetchOrdersPaginated(page, pageSize);
    return orders;
  } catch (error) {
    console.error('Failed to load orders:', error);
    toast.error('Failed to load orders. Please try again.');
    
    // Return empty state instead of crashing
    return {
      orders: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }
}
```

### Pattern: Retry with Backoff

**Use When**: Operation is critical and might succeed on retry

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('All retry attempts failed');
}

// Usage
const result = await retryWithBackoff(
  () => fetchCriticalData(),
  3,
  1000
);
```

## Data Hydration

### Pattern: Using Shared Hydration Utility

**Use When**: You need to enrich orders with shipment or qboid data

```typescript
import { hydrateOrdersWithShipments } from '@/services/orderShipmentHydration';

// Fetch base order data
const { data: orders } = await supabase
  .from('orders')
  .select('id, order_id, status, ...')
  .limit(50);

// Hydrate with shipments and qboid data
const hydratedOrders = await hydrateOrdersWithShipments(
  orders,
  true // Include qboid enrichment
);
```

## Testing Patterns

### Pattern: Testing with Mock Data

**Use When**: Writing unit tests

```typescript
import { vi } from 'vitest';
import { fetchOrdersPaginated } from '@/services/orderFetchPaginated';

// Mock the service
vi.mock('@/services/orderFetchPaginated', () => ({
  fetchOrdersPaginated: vi.fn()
}));

// In test
const mockOrders = [
  { id: '1', orderId: 'ORD-1234', status: 'ready_to_ship' }
];

(fetchOrdersPaginated as any).mockResolvedValue({
  orders: mockOrders,
  totalCount: 1,
  hasNextPage: false,
  hasPreviousPage: false
});
```

## Common Anti-Patterns to Avoid

### ❌ N+1 Queries
```typescript
// BAD: Makes N database calls
for (const order of orders) {
  const { data } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', order.id);
}

// GOOD: Single query with join or IN clause
const { data } = await supabase
  .from('shipments')
  .select('*')
  .in('order_id', orders.map(o => o.id));
```

### ❌ Premature Optimization
```typescript
// BAD: Complex caching for rarely accessed data
const cache = new LRU({ max: 1000, ttl: 3600000 });

// GOOD: Simple caching for hot path only
const recentOrdersCache = new Map();
```

### ❌ Over-fetching
```typescript
// BAD: Fetching everything to filter client-side
const allOrders = await fetchAllOrders(); // 10,000 orders!
const recent = allOrders.filter(o => isRecent(o));

// GOOD: Filter server-side
const recent = await fetchOrdersPaginated(1, 50, '', 'recent');
```

## Summary Checklist

- ✅ Use paginated APIs for list views
- ✅ Batch database operations
- ✅ Reuse heavy objects (engines, connections)
- ✅ Specify narrow projections in queries
- ✅ Implement smart backoff, not fixed delays
- ✅ Use React Query for frequently accessed data
- ✅ Monitor performance with telemetry
- ✅ Handle errors gracefully
- ✅ Use shared hydration utilities
- ❌ Avoid SELECT *
- ❌ Avoid N+1 queries
- ❌ Avoid creating engines in loops
- ❌ Avoid fixed delay anti-patterns

## Additional Resources

- [Performance Optimization Guide](./performance-optimization-guide.md)
- [Supabase Best Practices](https://supabase.com/docs/guides/database/performance)
- [React Query Documentation](https://tanstack.com/query/latest)
