
import { useState, useEffect } from "react";
import { Item } from "@/types/itemMaster";

// Mock data for now - in a real app this would come from a database
const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    sku: 'ELEC001',
    name: 'Wireless Headphones',
    length: 8,
    width: 6,
    height: 3,
    weight: 0.8,
    category: 'Electronics',
    isActive: true
  },
  {
    id: '2',
    sku: 'BOOK001',
    name: 'Programming Guide',
    length: 9,
    width: 7,
    height: 1.5,
    weight: 2.1,
    category: 'Books',
    isActive: true
  },
  {
    id: '3',
    sku: 'CLOTH001',
    name: 'Cotton T-Shirt',
    length: 12,
    width: 8,
    height: 0.5,
    weight: 0.3,
    category: 'Clothing',
    isActive: true
  }
];

export const useItemMaster = () => {
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('item_master');
    return saved ? JSON.parse(saved) : MOCK_ITEMS;
  });
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('item_master', JSON.stringify(items));
  }, [items]);

  const createItem = async (itemData: Omit<Item, 'id'>) => {
    setLoading(true);
    try {
      const newItem = {
        ...itemData,
        id: Date.now().toString() // Simple ID generation
      };
      setItems(prev => [...prev, newItem]);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (updatedItem: Item) => {
    setLoading(true);
    try {
      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    setLoading(true);
    try {
      setItems(prev => prev.filter(item => item.id !== id));
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    createItem,
    updateItem,
    deleteItem
  };
};
