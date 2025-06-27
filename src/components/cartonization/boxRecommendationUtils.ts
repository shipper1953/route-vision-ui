
import { CartonizationEngine, Box } from "@/services/cartonization/cartonizationEngine";
import { fetchOrders } from "@/services/orderService";

// Comprehensive Uline-style box catalog with ECT-32 equivalent options
export const CATALOG_BOXES: Box[] = [
  // Small boxes (4-9 inch range)
  { id: 'cat-1', name: 'Tiny Cube 4x4x4', length: 4, width: 4, height: 4, maxWeight: 8, cost: 0.95, inStock: 0, type: 'box' },
  { id: 'cat-2', name: 'Small Cube 5x5x5', length: 5, width: 5, height: 5, maxWeight: 10, cost: 1.15, inStock: 0, type: 'box' },
  { id: 'cat-3', name: 'Small Rectangle 6x4x4', length: 6, width: 4, height: 4, maxWeight: 12, cost: 1.25, inStock: 0, type: 'box' },
  { id: 'cat-4', name: 'Small Flat 6x5x3', length: 6, width: 5, height: 3, maxWeight: 10, cost: 1.20, inStock: 0, type: 'box' },
  { id: 'cat-5', name: 'Small Square 6x6x4', length: 6, width: 6, height: 4, maxWeight: 15, cost: 1.35, inStock: 0, type: 'box' },
  { id: 'cat-6', name: 'Small Cube 6x6x6', length: 6, width: 6, height: 6, maxWeight: 18, cost: 1.50, inStock: 0, type: 'box' },
  { id: 'cat-7', name: 'Small Tall 6x6x9', length: 6, width: 6, height: 9, maxWeight: 20, cost: 1.75, inStock: 0, type: 'box' },
  { id: 'cat-8', name: 'Small Rectangle 7x5x5', length: 7, width: 5, height: 5, maxWeight: 15, cost: 1.40, inStock: 0, type: 'box' },
  { id: 'cat-9', name: 'Small Flat 7x7x5', length: 7, width: 7, height: 5, maxWeight: 18, cost: 1.55, inStock: 0, type: 'box' },
  { id: 'cat-10', name: 'Small Cube 7x7x7', length: 7, width: 7, height: 7, maxWeight: 22, cost: 1.70, inStock: 0, type: 'box' },
  
  // Medium-small boxes (8-9 inch range)
  { id: 'cat-11', name: 'Medium Rectangle 8x4x4', length: 8, width: 4, height: 4, maxWeight: 15, cost: 1.45, inStock: 0, type: 'box' },
  { id: 'cat-12', name: 'Medium Tall 8x4x8', length: 8, width: 4, height: 8, maxWeight: 20, cost: 1.65, inStock: 0, type: 'box' },
  { id: 'cat-13', name: 'Medium Rectangle 8x6x4', length: 8, width: 6, height: 4, maxWeight: 18, cost: 1.55, inStock: 0, type: 'box' },
  { id: 'cat-14', name: 'Medium Square 8x6x6', length: 8, width: 6, height: 6, maxWeight: 22, cost: 1.70, inStock: 0, type: 'box' },
  { id: 'cat-15', name: 'Medium Tall 8x6x10', length: 8, width: 6, height: 10, maxWeight: 25, cost: 1.95, inStock: 0, type: 'box' },
  { id: 'cat-16', name: 'Medium Flat 8x8x4', length: 8, width: 8, height: 4, maxWeight: 20, cost: 1.65, inStock: 0, type: 'box' },
  { id: 'cat-17', name: 'Medium Square 8x8x5', length: 8, width: 8, height: 5, maxWeight: 22, cost: 1.75, inStock: 0, type: 'box' },
  { id: 'cat-18', name: 'Medium Rectangle 8x8x6', length: 8, width: 8, height: 6, maxWeight: 25, cost: 1.85, inStock: 0, type: 'box' },
  { id: 'cat-19', name: 'Medium Cube 8x8x8', length: 8, width: 8, height: 8, maxWeight: 30, cost: 2.10, inStock: 0, type: 'box' },
  { id: 'cat-20', name: 'Medium Flat 9x6x3', length: 9, width: 6, height: 3, maxWeight: 15, cost: 1.50, inStock: 0, type: 'box' },
  { id: 'cat-21', name: 'Medium Rectangle 9x6x4', length: 9, width: 6, height: 4, maxWeight: 18, cost: 1.60, inStock: 0, type: 'box' },
  { id: 'cat-22', name: 'Medium Square 9x6x6', length: 9, width: 6, height: 6, maxWeight: 22, cost: 1.75, inStock: 0, type: 'box' },
  { id: 'cat-23', name: 'Medium Rectangle 9x7x4', length: 9, width: 7, height: 4, maxWeight: 20, cost: 1.70, inStock: 0, type: 'box' },
  { id: 'cat-24', name: 'Medium Rectangle 9x7x5', length: 9, width: 7, height: 5, maxWeight: 22, cost: 1.80, inStock: 0, type: 'box' },
  { id: 'cat-25', name: 'Medium Flat 9x9x4', length: 9, width: 9, height: 4, maxWeight: 22, cost: 1.80, inStock: 0, type: 'box' },
  { id: 'cat-26', name: 'Medium Square 9x9x5', length: 9, width: 9, height: 5, maxWeight: 25, cost: 1.90, inStock: 0, type: 'box' },
  { id: 'cat-27', name: 'Medium Rectangle 9x9x6', length: 9, width: 9, height: 6, maxWeight: 28, cost: 2.00, inStock: 0, type: 'box' },
  { id: 'cat-28', name: 'Medium Cube 9x9x9', length: 9, width: 9, height: 9, maxWeight: 35, cost: 2.25, inStock: 0, type: 'box' },

  // Large boxes (10-12 inch range)
  { id: 'cat-29', name: 'Large Rectangle 10x4x4', length: 10, width: 4, height: 4, maxWeight: 20, cost: 1.75, inStock: 0, type: 'box' },
  { id: 'cat-30', name: 'Large Rectangle 10x5x5', length: 10, width: 5, height: 5, maxWeight: 22, cost: 1.85, inStock: 0, type: 'box' },
  { id: 'cat-31', name: 'Large Flat 10x6x2', length: 10, width: 6, height: 2, maxWeight: 15, cost: 1.65, inStock: 0, type: 'box' },
  { id: 'cat-32', name: 'Large Rectangle 10x6x4', length: 10, width: 6, height: 4, maxWeight: 22, cost: 1.80, inStock: 0, type: 'box' },
  { id: 'cat-33', name: 'Large Square 10x6x6', length: 10, width: 6, height: 6, maxWeight: 25, cost: 1.95, inStock: 0, type: 'box' },
  { id: 'cat-34', name: 'Large Flat 10x7x2', length: 10, width: 7, height: 2, maxWeight: 18, cost: 1.70, inStock: 0, type: 'box' },
  { id: 'cat-35', name: 'Large Rectangle 10x7x5', length: 10, width: 7, height: 5, maxWeight: 25, cost: 1.95, inStock: 0, type: 'box' },
  { id: 'cat-36', name: 'Large Square 10x7x7', length: 10, width: 7, height: 7, maxWeight: 30, cost: 2.15, inStock: 0, type: 'box' },
  { id: 'cat-37', name: 'Large Rectangle 10x8x4', length: 10, width: 8, height: 4, maxWeight: 25, cost: 2.00, inStock: 0, type: 'box' },
  { id: 'cat-38', name: 'Large Rectangle 10x8x5', length: 10, width: 8, height: 5, maxWeight: 28, cost: 2.10, inStock: 0, type: 'box' },
  { id: 'cat-39', name: 'Large Rectangle 10x8x6', length: 10, width: 8, height: 6, maxWeight: 30, cost: 2.20, inStock: 0, type: 'box' },
  { id: 'cat-40', name: 'Large Cube 10x8x8', length: 10, width: 8, height: 8, maxWeight: 35, cost: 2.40, inStock: 0, type: 'box' },
  { id: 'cat-41', name: 'Large Flat 10x10x4', length: 10, width: 10, height: 4, maxWeight: 28, cost: 2.20, inStock: 0, type: 'box' },

  // Extra-large boxes (12-15 inch range)
  { id: 'cat-42', name: 'XL Flat 12x12x3', length: 12, width: 12, height: 3, maxWeight: 30, cost: 2.50, inStock: 0, type: 'box' },
  { id: 'cat-43', name: 'XL Rectangle 12x12x7', length: 12, width: 12, height: 7, maxWeight: 40, cost: 2.95, inStock: 0, type: 'box' },
  { id: 'cat-44', name: 'XL Rectangle 12x12x8', length: 12, width: 12, height: 8, maxWeight: 45, cost: 3.15, inStock: 0, type: 'box' },
  { id: 'cat-45', name: 'XL Rectangle 12x12x9', length: 12, width: 12, height: 9, maxWeight: 48, cost: 3.35, inStock: 0, type: 'box' },
  { id: 'cat-46', name: 'XL Rectangle 12x12x10', length: 12, width: 12, height: 10, maxWeight: 50, cost: 3.55, inStock: 0, type: 'box' },
  { id: 'cat-47', name: 'XL Cube 12x12x12', length: 12, width: 12, height: 12, maxWeight: 55, cost: 3.95, inStock: 0, type: 'box' },
  { id: 'cat-48', name: 'XL Flat 13x10x3', length: 13, width: 10, height: 3, maxWeight: 30, cost: 2.75, inStock: 0, type: 'box' },
  { id: 'cat-49', name: 'XL Rectangle 13x10x4', length: 13, width: 10, height: 4, maxWeight: 35, cost: 2.95, inStock: 0, type: 'box' },
  { id: 'cat-50', name: 'XL Rectangle 13x10x6', length: 13, width: 10, height: 6, maxWeight: 40, cost: 3.25, inStock: 0, type: 'box' },
  { id: 'cat-51', name: 'XL Rectangle 13x10x10', length: 13, width: 10, height: 10, maxWeight: 50, cost: 3.75, inStock: 0, type: 'box' },
  { id: 'cat-52', name: 'XL Rectangle 13x11x6', length: 13, width: 11, height: 6, maxWeight: 42, cost: 3.35, inStock: 0, type: 'box' },
  { id: 'cat-53', name: 'XL Rectangle 13x13x10', length: 13, width: 13, height: 10, maxWeight: 55, cost: 4.15, inStock: 0, type: 'box' },
  { id: 'cat-54', name: 'XL Cube 13x13x13', length: 13, width: 13, height: 13, maxWeight: 60, cost: 4.55, inStock: 0, type: 'box' },
  { id: 'cat-55', name: 'XL Rectangle 13x5x5', length: 13, width: 5, height: 5, maxWeight: 30, cost: 2.45, inStock: 0, type: 'box' },
  { id: 'cat-56', name: 'XL Rectangle 13x9x5', length: 13, width: 9, height: 5, maxWeight: 35, cost: 2.85, inStock: 0, type: 'box' },

  // XXL boxes (14-18 inch range)
  { id: 'cat-57', name: 'XXL Rectangle 14x10x4', length: 14, width: 10, height: 4, maxWeight: 40, cost: 3.25, inStock: 0, type: 'box' },
  { id: 'cat-58', name: 'XXL Rectangle 14x10x6', length: 14, width: 10, height: 6, maxWeight: 45, cost: 3.55, inStock: 0, type: 'box' },
  { id: 'cat-59', name: 'XXL Rectangle 14x10x8', length: 14, width: 10, height: 8, maxWeight: 50, cost: 3.85, inStock: 0, type: 'box' },
  { id: 'cat-60', name: 'XXL Rectangle 14x10x10', length: 14, width: 10, height: 10, maxWeight: 55, cost: 4.15, inStock: 0, type: 'box' },
  { id: 'cat-61', name: 'XXL Rectangle 14x12x4', length: 14, width: 12, height: 4, maxWeight: 45, cost: 3.55, inStock: 0, type: 'box' },
  { id: 'cat-62', name: 'XXL Rectangle 14x12x5', length: 14, width: 12, height: 5, maxWeight: 48, cost: 3.75, inStock: 0, type: 'box' },
  { id: 'cat-63', name: 'XXL Rectangle 14x12x6', length: 14, width: 12, height: 6, maxWeight: 50, cost: 3.95, inStock: 0, type: 'box' },
  { id: 'cat-64', name: 'XXL Rectangle 14x12x8', length: 14, width: 12, height: 8, maxWeight: 55, cost: 4.35, inStock: 0, type: 'box' },
  { id: 'cat-65', name: 'XXL Rectangle 14x12x10', length: 14, width: 12, height: 10, maxWeight: 60, cost: 4.75, inStock: 0, type: 'box' },
  { id: 'cat-66', name: 'XXL Rectangle 14x12x12', length: 14, width: 12, height: 12, maxWeight: 65, cost: 5.15, inStock: 0, type: 'box' },
  { id: 'cat-67', name: 'XXL Flat 14x14x4', length: 14, width: 14, height: 4, maxWeight: 50, cost: 4.15, inStock: 0, type: 'box' },
  { id: 'cat-68', name: 'XXL Rectangle 14x14x6', length: 14, width: 14, height: 6, maxWeight: 55, cost: 4.55, inStock: 0, type: 'box' },
  { id: 'cat-69', name: 'XXL Rectangle 14x14x8', length: 14, width: 14, height: 8, maxWeight: 60, cost: 4.95, inStock: 0, type: 'box' },
  { id: 'cat-70', name: 'XXL Rectangle 14x14x10', length: 14, width: 14, height: 10, maxWeight: 65, cost: 5.35, inStock: 0, type: 'box' },
  { id: 'cat-71', name: 'XXL Rectangle 14x14x12', length: 14, width: 14, height: 12, maxWeight: 70, cost: 5.75, inStock: 0, type: 'box' },
  { id: 'cat-72', name: 'XXL Cube 14x14x14', length: 14, width: 14, height: 14, maxWeight: 75, cost: 6.25, inStock: 0, type: 'box' },
  { id: 'cat-73', name: 'XXL Rectangle 14x6x6', length: 14, width: 6, height: 6, maxWeight: 40, cost: 3.15, inStock: 0, type: 'box' },
  { id: 'cat-74', name: 'XXL Rectangle 14x6x8', length: 14, width: 6, height: 8, maxWeight: 45, cost: 3.45, inStock: 0, type: 'box' },
  { id: 'cat-75', name: 'XXL Rectangle 14x7x5', length: 14, width: 7, height: 5, maxWeight: 42, cost: 3.25, inStock: 0, type: 'box' },
  { id: 'cat-76', name: 'XXL Rectangle 14x8x6', length: 14, width: 8, height: 6, maxWeight: 45, cost: 3.55, inStock: 0, type: 'box' },
  { id: 'cat-77', name: 'XXL Rectangle 14x8x8', length: 14, width: 8, height: 8, maxWeight: 50, cost: 3.85, inStock: 0, type: 'box' },
  { id: 'cat-78', name: 'XXL Rectangle 14x9x4', length: 14, width: 9, height: 4, maxWeight: 42, cost: 3.35, inStock: 0, type: 'box' },
  { id: 'cat-79', name: 'XXL Rectangle 14x9x9', length: 14, width: 9, height: 9, maxWeight: 55, cost: 4.15, inStock: 0, type: 'box' },
  
  // XXXL boxes (15-18 inch range)
  { id: 'cat-80', name: 'XXXL Flat 15x10x2', length: 15, width: 10, height: 2, maxWeight: 35, cost: 3.25, inStock: 0, type: 'box' },
  { id: 'cat-81', name: 'XXXL Rectangle 15x10x6', length: 15, width: 10, height: 6, maxWeight: 50, cost: 3.95, inStock: 0, type: 'box' },
  { id: 'cat-82', name: 'XXXL Rectangle 15x10x10', length: 15, width: 10, height: 10, maxWeight: 60, cost: 4.65, inStock: 0, type: 'box' },
  { id: 'cat-83', name: 'XXXL Rectangle 15x11x7', length: 15, width: 11, height: 7, maxWeight: 55, cost: 4.35, inStock: 0, type: 'box' },
  { id: 'cat-84', name: 'XXXL Rectangle 15x12x6', length: 15, width: 12, height: 6, maxWeight: 55, cost: 4.45, inStock: 0, type: 'box' },
  { id: 'cat-85', name: 'XXXL Rectangle 15x12x8', length: 15, width: 12, height: 8, maxWeight: 60, cost: 4.85, inStock: 0, type: 'box' },
  { id: 'cat-86', name: 'XXXL Rectangle 15x12x10', length: 15, width: 12, height: 10, maxWeight: 65, cost: 5.25, inStock: 0, type: 'box' },
  { id: 'cat-87', name: 'XXXL Rectangle 15x12x12', length: 15, width: 12, height: 12, maxWeight: 70, cost: 5.65, inStock: 0, type: 'box' },
  { id: 'cat-88', name: 'XXXL Rectangle 15x13x5', length: 15, width: 13, height: 5, maxWeight: 55, cost: 4.35, inStock: 0, type: 'box' },
  { id: 'cat-89', name: 'XXXL Rectangle 15x15x6', length: 15, width: 15, height: 6, maxWeight: 60, cost: 5.15, inStock: 0, type: 'box' },
  { id: 'cat-90', name: 'XXXL Rectangle 15x15x10', length: 15, width: 15, height: 10, maxWeight: 70, cost: 5.95, inStock: 0, type: 'box' },
  { id: 'cat-91', name: 'XXXL Rectangle 15x15x12', length: 15, width: 15, height: 12, maxWeight: 75, cost: 6.45, inStock: 0, type: 'box' },
  { id: 'cat-92', name: 'XXXL Cube 15x15x15', length: 15, width: 15, height: 15, maxWeight: 80, cost: 6.95, inStock: 0, type: 'box' },
  
  // Giant boxes (16-18 inch range)
  { id: 'cat-93', name: 'Giant Rectangle 16x8x6', length: 16, width: 8, height: 6, maxWeight: 50, cost: 4.15, inStock: 0, type: 'box' },
  { id: 'cat-94', name: 'Giant Rectangle 16x8x8', length: 16, width: 8, height: 8, maxWeight: 55, cost: 4.55, inStock: 0, type: 'box' },
  { id: 'cat-95', name: 'Giant Rectangle 16x10x6', length: 16, width: 10, height: 6, maxWeight: 55, cost: 4.65, inStock: 0, type: 'box' },
  { id: 'cat-96', name: 'Giant Rectangle 16x10x8', length: 16, width: 10, height: 8, maxWeight: 60, cost: 5.05, inStock: 0, type: 'box' },
  { id: 'cat-97', name: 'Giant Rectangle 16x10x10', length: 16, width: 10, height: 10, maxWeight: 65, cost: 5.45, inStock: 0, type: 'box' },
  { id: 'cat-98', name: 'Giant Rectangle 16x12x4', length: 16, width: 12, height: 4, maxWeight: 55, cost: 4.75, inStock: 0, type: 'box' },
  { id: 'cat-99', name: 'Giant Rectangle 16x12x6', length: 16, width: 12, height: 6, maxWeight: 60, cost: 5.15, inStock: 0, type: 'box' },
  { id: 'cat-100', name: 'Giant Rectangle 16x12x8', length: 16, width: 12, height: 8, maxWeight: 65, cost: 5.55, inStock: 0, type: 'box' },
  { id: 'cat-101', name: 'Giant Rectangle 16x12x10', length: 16, width: 12, height: 10, maxWeight: 70, cost: 5.95, inStock: 0, type: 'box' },
  { id: 'cat-102', name: 'Giant Rectangle 16x12x12', length: 16, width: 12, height: 12, maxWeight: 75, cost: 6.35, inStock: 0, type: 'box' },
  { id: 'cat-103', name: 'Giant Rectangle 16x13x13', length: 16, width: 13, height: 13, maxWeight: 80, cost: 6.85, inStock: 0, type: 'box' },
  { id: 'cat-104', name: 'Giant Flat 16x14x3', length: 16, width: 14, height: 3, maxWeight: 50, cost: 4.85, inStock: 0, type: 'box' },
  { id: 'cat-105', name: 'Giant Rectangle 16x14x6', length: 16, width: 14, height: 6, maxWeight: 65, cost: 5.65, inStock: 0, type: 'box' },
  { id: 'cat-106', name: 'Giant Rectangle 16x14x8', length: 16, width: 14, height: 8, maxWeight: 70, cost: 6.05, inStock: 0, type: 'box' },
  { id: 'cat-107', name: 'Giant Rectangle 16x14x10', length: 16, width: 14, height: 10, maxWeight: 75, cost: 6.45, inStock: 0, type: 'box' },
  { id: 'cat-108', name: 'Giant Rectangle 16x14x12', length: 16, width: 14, height: 12, maxWeight: 80, cost: 6.85, inStock: 0, type: 'box' },
  { id: 'cat-109', name: 'Giant Flat 16x16x4', length: 16, width: 16, height: 4, maxWeight: 60, cost: 5.85, inStock: 0, type: 'box' },
  
  // Super Giant boxes (18-24 inch range)
  { id: 'cat-110', name: 'Super Giant Rectangle 18x10x10', length: 18, width: 10, height: 10, maxWeight: 70, cost: 6.15, inStock: 0, type: 'box' },
  { id: 'cat-111', name: 'Super Giant Flat 18x12x4', length: 18, width: 12, height: 4, maxWeight: 60, cost: 5.45, inStock: 0, type: 'box' },
  { id: 'cat-112', name: 'Super Giant Rectangle 18x12x6', length: 18, width: 12, height: 6, maxWeight: 65, cost: 5.85, inStock: 0, type: 'box' },
  { id: 'cat-113', name: 'Super Giant Rectangle 18x12x8', length: 18, width: 12, height: 8, maxWeight: 70, cost: 6.25, inStock: 0, type: 'box' },
  { id: 'cat-114', name: 'Super Giant Rectangle 18x12x9', length: 18, width: 12, height: 9, maxWeight: 72, cost: 6.45, inStock: 0, type: 'box' },
  { id: 'cat-115', name: 'Super Giant Rectangle 18x12x10', length: 18, width: 12, height: 10, maxWeight: 75, cost: 6.65, inStock: 0, type: 'box' },
  { id: 'cat-116', name: 'Super Giant Rectangle 18x12x12', length: 18, width: 12, height: 12, maxWeight: 80, cost: 7.05, inStock: 0, type: 'box' },
  { id: 'cat-117', name: 'Super Giant Rectangle 18x12x14', length: 18, width: 12, height: 14, maxWeight: 85, cost: 7.45, inStock: 0, type: 'box' },
  { id: 'cat-118', name: 'Super Giant Flat 18x14x3', length: 18, width: 14, height: 3, maxWeight: 60, cost: 5.85, inStock: 0, type: 'box' },
  { id: 'cat-119', name: 'Super Giant Flat 18x18x4', length: 18, width: 18, height: 4, maxWeight: 70, cost: 6.85, inStock: 0, type: 'box' },
  { id: 'cat-120', name: 'Super Giant Rectangle 18x18x6', length: 18, width: 18, height: 6, maxWeight: 75, cost: 7.35, inStock: 0, type: 'box' },
  { id: 'cat-121', name: 'Super Giant Rectangle 18x18x8', length: 18, width: 18, height: 8, maxWeight: 80, cost: 7.85, inStock: 0, type: 'box' },
  { id: 'cat-122', name: 'Super Giant Rectangle 18x18x10', length: 18, width: 18, height: 10, maxWeight: 85, cost: 8.35, inStock: 0, type: 'box' },
  { id: 'cat-123', name: 'Super Giant Rectangle 18x18x12', length: 18, width: 18, height: 12, maxWeight: 90, cost: 8.85, inStock: 0, type: 'box' },
  { id: 'cat-124', name: 'Super Giant Rectangle 18x18x16', length: 18, width: 18, height: 16, maxWeight: 95, cost: 9.85, inStock: 0, type: 'box' },
  { id: 'cat-125', name: 'Super Giant Cube 18x18x18', length: 18, width: 18, height: 18, maxWeight: 100, cost: 10.85, inStock: 0, type: 'box' },
  { id: 'cat-126', name: 'Super Giant Tall 18x18x24', length: 18, width: 18, height: 24, maxWeight: 110, cost: 13.85, inStock: 0, type: 'box' },
  
  // Mega boxes (20-24 inch range)
  { id: 'cat-127', name: 'Mega Rectangle 20x8x8', length: 20, width: 8, height: 8, maxWeight: 70, cost: 6.85, inStock: 0, type: 'box' },
  { id: 'cat-128', name: 'Mega Rectangle 20x14x14', length: 20, width: 14, height: 14, maxWeight: 95, cost: 9.45, inStock: 0, type: 'box' },
  { id: 'cat-129', name: 'Mega Rectangle 20x15x15', length: 20, width: 15, height: 15, maxWeight: 100, cost: 10.15, inStock: 0, type: 'box' },
  { id: 'cat-130', name: 'Mega Rectangle 20x16x6', length: 20, width: 16, height: 6, maxWeight: 80, cost: 7.85, inStock: 0, type: 'box' },
  { id: 'cat-131', name: 'Mega Rectangle 20x16x8', length: 20, width: 16, height: 8, maxWeight: 85, cost: 8.35, inStock: 0, type: 'box' },
  { id: 'cat-132', name: 'Mega Rectangle 20x16x10', length: 20, width: 16, height: 10, maxWeight: 90, cost: 8.85, inStock: 0, type: 'box' },
  { id: 'cat-133', name: 'Mega Rectangle 20x16x12', length: 20, width: 16, height: 12, maxWeight: 95, cost: 9.35, inStock: 0, type: 'box' },
  { id: 'cat-134', name: 'Mega Rectangle 20x16x14', length: 20, width: 16, height: 14, maxWeight: 100, cost: 9.85, inStock: 0, type: 'box' },
  { id: 'cat-135', name: 'Mega Cube 20x16x16', length: 20, width: 16, height: 16, maxWeight: 105, cost: 10.85, inStock: 0, type: 'box' },
  { id: 'cat-136', name: 'Mega Rectangle 22x18x16', length: 22, width: 18, height: 16, maxWeight: 110, cost: 11.85, inStock: 0, type: 'box' },
  { id: 'cat-137', name: 'Mega Rectangle 22x22x12', length: 22, width: 22, height: 12, maxWeight: 115, cost: 12.85, inStock: 0, type: 'box' },
  { id: 'cat-138', name: 'Mega Rectangle 24x6x6', length: 24, width: 6, height: 6, maxWeight: 60, cost: 6.85, inStock: 0, type: 'box' },
  { id: 'cat-139', name: 'Mega Rectangle 24x8x8', length: 24, width: 8, height: 8, maxWeight: 70, cost: 7.85, inStock: 0, type: 'box' },
  { id: 'cat-140', name: 'Mega Rectangle 24x10x10', length: 24, width: 10, height: 10, maxWeight: 80, cost: 8.85, inStock: 0, type: 'box' },
  { id: 'cat-141', name: 'Mega Rectangle 24x12x6', length: 24, width: 12, height: 6, maxWeight: 75, cost: 8.15, inStock: 0, type: 'box' },
  { id: 'cat-142', name: 'Mega Rectangle 24x12x8', length: 24, width: 12, height: 8, maxWeight: 80, cost: 8.65, inStock: 0, type: 'box' },
  { id: 'cat-143', name: 'Mega Rectangle 24x18x16', length: 24, width: 18, height: 16, maxWeight: 120, cost: 13.85, inStock: 0, type: 'box' },
  { id: 'cat-144', name: 'Mega Rectangle 24x18x18', length: 24, width: 18, height: 18, maxWeight: 125, cost: 14.85, inStock: 0, type: 'box' },
  { id: 'cat-145', name: 'Mega Flat 24x24x6', length: 24, width: 24, height: 6, maxWeight: 100, cost: 11.85, inStock: 0, type: 'box' },

  // Poly mailers
  { id: 'cat-146', name: 'Small Poly Mailer 9x6x2', length: 9, width: 6, height: 2, maxWeight: 8, cost: 0.65, inStock: 0, type: 'poly_bag' },
  { id: 'cat-147', name: 'Medium Poly Mailer 12x9x3', length: 12, width: 9, height: 3, maxWeight: 12, cost: 0.85, inStock: 0, type: 'poly_bag' },
  { id: 'cat-148', name: 'Large Poly Mailer 14x11x4', length: 14, width: 11, height: 4, maxWeight: 18, cost: 1.15, inStock: 0, type: 'poly_bag' },
  { id: 'cat-149', name: 'XL Poly Mailer 16x12x4', length: 16, width: 12, height: 4, maxWeight: 20, cost: 1.35, inStock: 0, type: 'poly_bag' }
];

export interface BoxRecommendation {
  box: Box;
  potentialOrders: number;
  currentSuboptimalCost: number;
  projectedSavings: number;
  efficiencyGain: number;
  confidence: number;
  reasoning: string[];
}

export const analyzeBoxRecommendations = async (
  boxes: Box[], 
  parameters: any, 
  createItemsFromOrderData: (items: any[], masterItems: any[]) => any[]
): Promise<BoxRecommendation[]> => {
  const orders = await fetchOrders();
  
  // Filter for recent orders that need better packaging
  const recentOrders = orders.filter(order => 
    (order.status === 'ready_to_ship' || order.status === 'processing') &&
    order.items && Array.isArray(order.items) && order.items.length > 0
  );

  if (recentOrders.length === 0) {
    return [];
  }

  const currentEngine = new CartonizationEngine(boxes, parameters);
  const catalogEngine = new CartonizationEngine([...boxes, ...CATALOG_BOXES], parameters);
  
  const boxAnalysis = new Map<string, {
    orders: string[],
    currentCost: number,
    catalogCost: number,
    efficiencyImprovement: number,
    reasoning: string[]
  }>();

  // Analyze each order
  for (const order of recentOrders) {
    // Ensure items is an array before processing
    if (!Array.isArray(order.items)) {
      continue;
    }
    
    const items = createItemsFromOrderData(order.items, []);
    if (items.length === 0) continue;

    // Get current best recommendation
    const currentResult = currentEngine.calculateOptimalBox(items);
    
    // Get catalog recommendation
    const catalogResult = catalogEngine.calculateOptimalBox(items);

    if (currentResult && catalogResult && catalogResult.recommendedBox.id.startsWith('cat-')) {
      const catalogBoxId = catalogResult.recommendedBox.id;
      
      if (!boxAnalysis.has(catalogBoxId)) {
        boxAnalysis.set(catalogBoxId, {
          orders: [],
          currentCost: 0,
          catalogCost: 0,
          efficiencyImprovement: 0,
          reasoning: []
        });
      }

      const analysis = boxAnalysis.get(catalogBoxId)!;
      analysis.orders.push(order.id);
      analysis.currentCost += currentResult.recommendedBox.cost;
      analysis.catalogCost += catalogResult.recommendedBox.cost;

      // Calculate efficiency improvement
      const currentUtilization = currentResult.utilization;
      const catalogUtilization = catalogResult.utilization;
      const efficiencyGain = catalogUtilization - currentUtilization;
      
      if (efficiencyGain > 0) {
        analysis.efficiencyImprovement += efficiencyGain;
        
        // Add reasoning
        if (efficiencyGain > 10) {
          analysis.reasoning.push(`${efficiencyGain.toFixed(1)}% better space utilization`);
        }
        if (catalogResult.recommendedBox.cost < currentResult.recommendedBox.cost) {
          const savings = currentResult.recommendedBox.cost - catalogResult.recommendedBox.cost;
          analysis.reasoning.push(`$${savings.toFixed(2)} cost savings per order`);
        }
        if (catalogResult.confidence > currentResult.confidence) {
          analysis.reasoning.push(`${(catalogResult.confidence - currentResult.confidence).toFixed(0)} points higher confidence`);
        }
      }
    }
  }

  // Convert to recommendations and sort by impact
  const recommendations: BoxRecommendation[] = [];
  
  for (const [boxId, analysis] of boxAnalysis.entries()) {
    const catalogBox = CATALOG_BOXES.find(b => b.id === boxId);
    if (!catalogBox || analysis.orders.length === 0) continue;

    const avgEfficiencyGain = analysis.efficiencyImprovement / analysis.orders.length;
    const totalSavings = analysis.currentCost - analysis.catalogCost;
    
    // Only recommend if there's meaningful improvement
    if (avgEfficiencyGain > 5 || totalSavings > 0) {
      const uniqueReasons = [...new Set(analysis.reasoning)];
      
      recommendations.push({
        box: catalogBox,
        potentialOrders: analysis.orders.length,
        currentSuboptimalCost: analysis.currentCost,
        projectedSavings: Math.max(0, totalSavings),
        efficiencyGain: avgEfficiencyGain,
        confidence: Math.min(100, 60 + (avgEfficiencyGain * 2) + (totalSavings > 0 ? 20 : 0)),
        reasoning: uniqueReasons.slice(0, 3) // Top 3 reasons
      });
    }
  }

  // Sort by combined impact score
  recommendations.sort((a, b) => {
    const aScore = (a.potentialOrders * 0.3) + (a.projectedSavings * 0.4) + (a.efficiencyGain * 0.3);
    const bScore = (b.potentialOrders * 0.3) + (b.projectedSavings * 0.4) + (b.efficiencyGain * 0.3);
    return bScore - aScore;
  });

  return recommendations.slice(0, 5); // Top 5 recommendations
};
