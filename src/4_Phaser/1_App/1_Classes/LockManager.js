//*** LOCK HANDLER ***//
export default class LockManager {
  constructor(state, displayManager, regionManager) {
    this.state = state
    this.display = displayManager
    this.regions = regionManager

    this.sketchCheck = false
    window.addEventListener("returnCheck", (e) => { this.sketchCheck = e.detail.drawn })
  }

  // structure lock toggle
  toggleStructureLock(struct) {
    const box = struct.boundingBox
    const existingIndex = this.findExistingLock(struct.type, box)

    // check if clicked structure is already drawn
    this.dispatchSketchEvent('checkSketch', struct.type, box)
    console.log(this.sketchCheck)
    const drawn = this.sketchCheck;
    
    if (existingIndex !== null) {
      this.unlockStructure(struct.type, existingIndex, box, drawn)  // will erase if drawn = true
    } else {
      this.lockStructure(struct, box, !drawn) // will draw is not already drawn (aka if drawn = false)
    }
  }
  
  // checks if structure is already locked
  findExistingLock(type, box) {
    const regions = this.state.lockedRegions[type]
    if (!regions) return null
    
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i]
      if (region.topLeft.x === box.topLeft.x && region.topLeft.y === box.topLeft.y) {
        return i
      }
    }
    return null
  }
  
  // unlocks a locked structure
  unlockStructure(type, index, box, dispatch) {
    const region = this.state.lockedRegions[type][index]

    // remove tiles from locked display
    this.regions.clearRegion(box, this.state.lockedTiles)
    
    // remove outline rect
    this.display.removeLockRect(region.index)
    
    // remove from tracked locked regions
    this.state.lockedRegions[type].splice(index, 1)
    
    // erase struct on sketch canvas
    if (dispatch) { this.dispatchSketchEvent('phaserErase', type, box) }
  }

  unlockAll() {
    for(let type in this.state.lockedRegions){
      const regions = this.state.lockedRegions[type]
      if (!regions || regions.length === 0) continue
      
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i]
        const box = {
          topLeft: region.topLeft,
          width: region.width,
          height: region.height,
        }

        this.unlockStructure(type, 0, box)
      }
    }
  }
  
  // locks a structure
  lockStructure(struct, box, dispatch) {
    if (!this.state.lockedRegions[struct.type]) {
      this.state.lockedRegions[struct.type] = []
    }
    
    // unique indexes for easier removal
    const index = `${struct.type} ${this.state.lockedRegions[struct.type].length}`
    const lockRegion = {
      index: index,
      topLeft: box.topLeft,
      bottomRight: { x: box.topLeft.x + box.width, y: box.topLeft.y + box.height },
      width: box.width,
      height: box.height
    }
    
    // add to locked regions
    this.state.lockedRegions[struct.type].push(lockRegion)
    this.state.lockedTiles = this.regions.lockRegions(
      this.state.wfcResult,
      this.state.lockedRegions,
      this.state
    )
    
    // draw rect
    this.display.drawLockRect(lockRegion, index)
    
    // dispatch event to draw region on sketch canvas
    // (prevent user overlaps)
    if(dispatch){ this.dispatchSketchEvent('mapToSketch', struct.type, box) }
  }
  
  // dispacth event to draw region on sketch canvas
  dispatchSketchEvent(eventType, type, box) {
    const br = {
      x: box.topLeft.x + box.width,
      y: box.topLeft.y + box.height
    }
    
    const event = new CustomEvent(eventType, {
      detail: {
        type: type,
        region: {
          topLeft: {
            x: box.topLeft.x * this.regions.tileSize + 1,
            y: box.topLeft.y * this.regions.tileSize + 1
          },
          bottomRight: {
            x: br.x * this.regions.tileSize - 1,
            y: br.y * this.regions.tileSize - 1
          }
        }
      }
    })
    
    window.dispatchEvent(event)
  }
}