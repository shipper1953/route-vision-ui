export const getItemsDisplay = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return "No items";
  
  return items.map((item, idx) => {
    const name = item.name || item.description || `Item ${idx + 1}`;
    const quantity = item.quantity || item.count || 1;
    return `${name} (${quantity})`;
  }).join(", ");
};