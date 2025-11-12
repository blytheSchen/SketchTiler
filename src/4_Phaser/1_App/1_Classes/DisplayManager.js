//*** DISPLAY MANAGER ***//
export default class DisplayManager {
  constructor(scene, tileSize, suggestedAlpha = 0.5) {
    this.scene = scene
    this.tileSize = tileSize
    this.suggestedAlpha = suggestedAlpha
    
    this.displays = {
      ground: null,
      structs: null,
      paths: null,
      sketch: null,
      locked: null,
      layout: null
    }
    
    this.lockedRectDisplay = {}
  }
  
  // show a map on canvas
  displayMap(key, tilesArray, tilesetName, opacity = this.suggestedAlpha, gid = 1) {
    const display = this.displays[key]
    
    if (display) {
      display.map.destroy()
      display.layer.destroy()
    }
    
    const newDisplay = {
      map: this.scene.make.tilemap({
        data: tilesArray,
        tileWidth: this.tileSize,
        tileHeight: this.tileSize
      }),
      layer: null
    }
    
    const tileset = newDisplay.map.addTilesetImage("tileset", tilesetName, 16, 16, 0, 0, gid)
    newDisplay.layer = newDisplay.map.createLayer(0, tileset, 0, 0, 1)
    newDisplay.layer.alpha = opacity
    
    this.displays[key] = newDisplay
    return newDisplay
  }
  
  // outlines locked regions
  drawLockRect(region, index) {
    const rect = this.scene.add.rectangle(
      region.topLeft.x * this.tileSize,
      region.topLeft.y * this.tileSize,
      region.width * this.tileSize,
      region.height * this.tileSize
    )
    rect.setOrigin(0)
    rect.setStrokeStyle(2, 0xffffff)
    this.lockedRectDisplay[index] = rect
    return rect
  }

  // hides locked regions' outlines
  hideLockRects(){
    for(const index in this.lockedRectDisplay){
      const rect = this.lockedRectDisplay[index]
      rect.setStrokeStyle(0, 0, 0)
    }
  }

  // shows locked regions' outlines
  showLockRects(){
    for(const index in this.lockedRectDisplay){
      const rect = this.lockedRectDisplay[index]
      rect.setStrokeStyle(2, 0xffffff)
    }
  }
  
  // removes an outline from rendering
  removeLockRect(index) {
    if (this.lockedRectDisplay[index]) {
      this.lockedRectDisplay[index].destroy()
      delete this.lockedRectDisplay[index]
    }
  }
  
  // toggle visibiity of layout overlay
  setLayoutVisibility(visible) {
    if (this.displays.layout.layer) {
      this.displays.layout.layer.setVisible(visible)
    }
  }
  
  // removes a display map (and layer) from scene
  clearDisplay(key) {
    const display = this.displays[key]
    if (display) {
      display.map.destroy()
      display.layer.destroy()
      //this.displays[key] = null
    }
  }
}