//*** STATE MANAGER ***//
export default class StateManager {
  constructor(width, height) {
    this.width = width
    this.height = height
    
    // map state
    this.groundImage = null
    this.wfcResult = null
    this.layout = null
    
    // region tracking
    this.userRegions = {}
    this.lockedRegions = { house: [], path: [], fence: [], forest: [] }
    // this.lockedUserRegion = {}
    
    // tile arrays
    this.lockedTiles = this.createEmptyTileArray()
    this.userTiles = this.createEmptyTileArray()
  }
  
  createEmptyTileArray() {
    return Array.from({ length: this.height }, () => Array(this.width).fill(-1))
  }
  
  resetLockedTiles() {
    this.lockedTiles = this.createEmptyTileArray()
    // this.lockedUserRegion = {}
  }
}