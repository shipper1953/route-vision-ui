import { Item, Box, PackedItem, Space, PackingResult } from './types';

export class BinPackingAlgorithm {
  static enhanced3DBinPacking(items: Item[], box: Box): PackingResult {
    // Geometric feasibility pre-checks
    console.log(`🔍 Pre-checking geometric feasibility for ${items.length} unique items in ${box.name}`);
    
    for (const item of items) {
      // Check 1: Can the item fit in ANY orientation?
      const itemDims = [item.length, item.width, item.height].sort((a, b) => b - a);
      const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a);
      
      const canFitAnyOrientation = itemDims.every((dim, i) => dim <= boxDims[i]);
      if (!canFitAnyOrientation) {
        console.log(`❌ GEOMETRIC FAIL: Item "${item.name}" (${item.length}×${item.width}×${item.height}) cannot fit in box (${box.length}×${box.width}×${box.height}) in ANY orientation`);
        return {
          success: false,
          packedItems: [],
          usedVolume: 0,
          packingEfficiency: 0
        };
      }
      
      // Check 2: Longest dimension check (with realistic margin)
      const longestItemDim = Math.max(item.length, item.width, item.height);
      const longestBoxDim = Math.max(box.length, box.width, box.height);
      if (longestItemDim > longestBoxDim * 0.95) {
        console.log(`⚠️ WARNING: Item "${item.name}" longest dimension (${longestItemDim}") is ${((longestItemDim/longestBoxDim)*100).toFixed(1)}% of box longest dimension (${longestBoxDim}")`);
      }
    }
    
    // Expand items by quantity
    const expandedItems: Item[] = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    });
    
    // Check 3: Volume reality check with practical packing factor
    const totalItemVolume = expandedItems.reduce((sum, item) => 
      sum + (item.length * item.width * item.height), 0
    );
    const boxVolumeCalc = box.length * box.width * box.height;
    const theoreticalUtilization = (totalItemVolume / boxVolumeCalc) * 100;
    
    // Account for practical packing efficiency (~70-85% for real-world scenarios)
    const practicalPackingFactor = 0.75; // 75% is realistic for non-uniform items
    const expectedUtilization = theoreticalUtilization / practicalPackingFactor;
    
    console.log(`📊 Volume Analysis: Total items=${totalItemVolume.toFixed(0)} in³, Box=${boxVolumeCalc.toFixed(0)} in³`);
    console.log(`📊 Theoretical utilization=${theoreticalUtilization.toFixed(1)}%, Expected with packing factor=${expectedUtilization.toFixed(1)}%`);
    
    if (expectedUtilization > 100) {
      console.log(`❌ VOLUME FAIL: Expected utilization ${expectedUtilization.toFixed(1)}% exceeds box capacity even with optimal packing`);
      return {
        success: false,
        packedItems: [],
        usedVolume: 0,
        packingEfficiency: 0
      };
    }

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
    const boxVolumeFinal = box.length * box.width * box.height;
    const packingEfficiency = usedVolume / boxVolumeFinal;
    
    console.log(`✅ Successfully packed all ${packedItems.length} items. Used volume: ${usedVolume}/${boxVolumeFinal} (${(packingEfficiency * 100).toFixed(1)}%)`);
    
    return {
      success: true,
      packedItems,
      usedVolume,
      packingEfficiency
    };
  }
}