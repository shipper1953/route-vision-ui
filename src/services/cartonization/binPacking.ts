import { Item, Box, PackedItem, Space, PackingResult } from './types';

export class BinPackingAlgorithm {
  static enhanced3DBinPacking(items: Item[], box: Box): PackingResult {
    // Expand items by quantity
    const expandedItems: Item[] = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    });

    // Sort items by volume (largest first) for better packing
    const sortedItems = expandedItems.sort((a, b) => 
      (b.length * b.width * b.height) - (a.length * a.width * a.height)
    );

    const packedItems: PackedItem[] = [];
    const spaces: Space[] = [{
      x: 0, y: 0, z: 0,
      length: box.length,
      width: box.width,
      height: box.height
    }];

    console.log(`Starting 3D bin packing for ${sortedItems.length} items in box ${box.name} (${box.length}x${box.width}x${box.height})`);

    for (const item of sortedItems) {
      let itemPacked = false;
      
      // Try to find a space where this item fits
      for (let spaceIndex = 0; spaceIndex < spaces.length && !itemPacked; spaceIndex++) {
        const space = spaces[spaceIndex];
        
        // Try all 6 possible orientations of the item
        const orientations = [
          { l: item.length, w: item.width, h: item.height, rotated: false },
          { l: item.length, w: item.height, h: item.width, rotated: true },
          { l: item.width, w: item.length, h: item.height, rotated: true },
          { l: item.width, w: item.height, h: item.length, rotated: true },
          { l: item.height, w: item.length, h: item.width, rotated: true },
          { l: item.height, w: item.width, h: item.length, rotated: true }
        ];

        for (const orientation of orientations) {
          if (orientation.l <= space.length && 
              orientation.w <= space.width && 
              orientation.h <= space.height) {
            
            // Item fits in this orientation
            const packedItem: PackedItem = {
              item,
              x: space.x,
              y: space.y,
              z: space.z,
              length: orientation.l,
              width: orientation.w,
              height: orientation.h,
              rotated: orientation.rotated
            };
            
            packedItems.push(packedItem);
            
            // Remove the used space and create new spaces
            spaces.splice(spaceIndex, 1);
            
            // Create up to 3 new spaces from the remaining space
            const newSpaces: Space[] = [];
            
            // Right space
            if (space.x + orientation.l < space.x + space.length) {
              newSpaces.push({
                x: space.x + orientation.l,
                y: space.y,
                z: space.z,
                length: space.length - orientation.l,
                width: space.width,
                height: space.height
              });
            }
            
            // Back space
            if (space.y + orientation.w < space.y + space.width) {
              newSpaces.push({
                x: space.x,
                y: space.y + orientation.w,
                z: space.z,
                length: orientation.l,
                width: space.width - orientation.w,
                height: space.height
              });
            }
            
            // Top space
            if (space.z + orientation.h < space.z + space.height) {
              newSpaces.push({
                x: space.x,
                y: space.y,
                z: space.z + orientation.h,
                length: orientation.l,
                width: orientation.w,
                height: space.height - orientation.h
              });
            }
            
            // Add new spaces, sorted by volume (smallest first for better packing)
            newSpaces.sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));
            spaces.splice(spaceIndex, 0, ...newSpaces);
            
            itemPacked = true;
            console.log(`✅ Packed item ${item.name} (${orientation.l}x${orientation.w}x${orientation.h}${orientation.rotated ? ' rotated' : ''})`);
            break;
          }
        }
      }
      
      if (!itemPacked) {
        console.log(`❌ Could not pack item ${item.name} (${item.length}x${item.width}x${item.height})`);
        // Return failure if any item doesn't fit
        return {
          success: false,
          packedItems: [],
          usedVolume: 0,
          packingEfficiency: 0
        };
      }
    }
    
    // Calculate used volume and packing efficiency
    const usedVolume = packedItems.reduce((sum, packed) => 
      sum + (packed.length * packed.width * packed.height), 0
    );
    const boxVolume = box.length * box.width * box.height;
    const packingEfficiency = usedVolume / boxVolume;
    
    console.log(`✅ Successfully packed all ${packedItems.length} items. Used volume: ${usedVolume}/${boxVolume} (${(packingEfficiency * 100).toFixed(1)}%)`);
    
    return {
      success: true,
      packedItems,
      usedVolume,
      packingEfficiency
    };
  }
}