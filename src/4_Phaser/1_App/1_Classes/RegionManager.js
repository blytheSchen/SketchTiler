//*** REGION MANAGER ***//
export default class RegionManager {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
  
  // marks regions as locked (to prevent regeneration) 
  lockRegions(tilemap, regions, state) {
    const result = Array.from({ length: this.height }, () => Array(this.width).fill(-1))
    
    for (let type in regions) {
      const structRegions = regions[type]
      
      for (let box of structRegions) {
        if (this.regionOverlap(box, regions)) {
          const struct = this.getRegionFromMap(box, tilemap)
          this.copyRegionTiles(box, struct, result)
          
          // if (!state.lockedUserRegion[type]) {
          //   state.lockedUserRegion[type] = []
          // }
          // state.lockedUserRegion[type].push(box)
        }
      }
    }
    
    return result
  }
  
  // copy tiles from region (bounding box) of source array to destination array
  copyRegionTiles(region, source, dest) {
    for(let y = 0; y < region.height; y++){
      for(let x = 0; x < region.width; x++){
        // place generated structure tiles in tilemapImage
        let dy = region.topLeft.y + y
        let dx = region.topLeft.x + x
        
        dest[dy][dx] = source[y][x]
      }
    }
  }
  
  // marks tiles in region as empty  
  clearRegion(region, tilesArray) {
    for (let y = region.topLeft.y; y < region.topLeft.y + region.height; y++) {
      for (let x = region.topLeft.x; x < region.topLeft.x + region.width; x++) {
        tilesArray[y][x] = -1
      }
    }
  }

  // gets + returns a region of tiles from source
  getRegionFromMap(region, source){
    let result = []

    for(let y = 0; y < region.height; y++){
      result[y] = []
      for(let x = 0; x < region.width; x++){
        const dx = x + region.topLeft.x
        const dy = y + region.topLeft.y

        result[y][x] = source[dy][dx]
      }
    }
    return result
  }
  
  // checks if any part of region intersects a region in object
  regionOverlap(region, regionsObj) {
    for (let type in regionsObj) {
      for (let box of regionsObj[type]) {
        if (this.regionsIntersect(region, box)) {
          return true
        }
      }
    }
    return false
  }
  
  // checks for intersect bn r1 and r2
  regionsIntersect(r1, r2) {
    const r1Right = r1.topLeft.x + r1.width
    const r1Bottom = r1.topLeft.y + r1.height
    const r2Right = r2.topLeft.x + r2.width
    const r2Bottom = r2.topLeft.y + r2.height
    
    return (
      r1.topLeft.x <= r2Right &&
      r1Right >= r2.topLeft.x &&
      r1.topLeft.y <= r2Bottom &&
      r1Bottom >= r2.topLeft.y
    )
  }
  
  // checks if regions are the same
  regionsMatch(r1, r2) {
    return (
      r1.topLeft.x === r2.topLeft.x &&
      r1.topLeft.y === r2.topLeft.y &&
      r1.width === r2.width &&
      r1.height === r2.height
    )
  }
  
  // checks for regions in old that have been removed in new (undo helper)
  findRemovedRegions(oldRegions, newRegions) {
    const removed = []
    
    for (let type in oldRegions) {
      const oldBoxes = oldRegions[type]
      const newBoxes = newRegions[type] || []
      
      for (let oldBox of oldBoxes) {
        const stillExists = newBoxes.some(newBox => this.regionsMatch(oldBox, newBox))
        if (!stillExists) {
          removed.push({ ...oldBox, type })
        }
      }
    }
    
    return removed
  }
}