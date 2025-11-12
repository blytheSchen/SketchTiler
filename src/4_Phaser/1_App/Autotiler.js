// TODO
//  - better comments (JSDoc) 
//  - separate classes to different files (600+ lines here YIKES)
//  - ***structure regen?? right-click structures in phaser canvas to regenerate just that one structure
//    - lean in to the hierarchical appraoch more!
// BUGS
//  - fix undo/redo bugs after unlocking a locked region
//      - puts empty tiles atm :( should probably replace removes tiles which means more state tracking in phaser yayyyy
//      - only sometimes puts empty?? why  
//  - clicking on user drawn regions in phaser canvas draws a rect around the sketched region. 
//      - maybe skip canvas dispatch when we click user regions
//  - do more testing to catch anything else i fear im missing something 

import Phaser from "../../../lib/phaserModule.js";
import TILEMAP from "../3_Utils/tilemap.js";
import WFCModel from "../../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../../2_WFC/2_Input/images.js";
import generateHouse from "../../3_Generators/generateHouse.js";
import generateForest from "../../3_Generators/generateForest.js";
import generateFence from "../../3_Generators/generateFence.js";
import generatePaths from "../../3_Generators/generatePaths.js";
import { Regions } from "../../1_Sketchpad/1_Classes/regions.js";
import { exportSketch } from "../../1_Sketchpad/sketchpad.js";
import generateLayout from "../../3_Generators/generateLayout.js";
import Layout from "../../5_Utility/getWorldLayout.js";

//*** STATE MANAGER ***//
class StateManager {
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

//*** DISPLAY MANAGER ***//
class DisplayManager {
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

//*** REGION MANAGER ***//
class RegionManager {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
  
  // marks regions as marked (to prevent regeneration) 
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

//*** LOCK HANDLER ***//
class LockHandler {
  constructor(state, displayManager, regionManager, tileSize) {
    this.state = state
    this.display = displayManager
    this.regions = regionManager
    this.tileSize = tileSize
  }
  
  // handles clicks in phaser canvas
  handleClick(e) {
    if (!this.state.layout) return
    
    // convert pixel coord to tiles
    const tx = Math.floor(e.layerX / this.tileSize)
    const ty = Math.floor(e.layerY / this.tileSize)
    
    if (this.state.layout.layoutMap[ty][tx] <= 0) return // ignore empty regions

    // check if clicking a region (structure)
    for (let struct of this.state.layout.worldFacts) {
      if (this.isClickInStructure(tx, ty, struct)) {
        this.toggleStructureLock(struct)  // lock structure
        break
      }
    }
  }
  
  // compare click coords to struct bounding box
  isClickInStructure(tx, ty, struct) {
    const box = struct.boundingBox
    const br = {
      x: box.topLeft.x + box.width,
      y: box.topLeft.y + box.height
    }
    
    return (
      box.topLeft.x <= tx &&
      box.topLeft.y <= ty &&
      br.x >= tx &&
      br.y >= ty
    )
  }
  
  // structure lock toggle
  toggleStructureLock(struct) {
    const box = struct.boundingBox
    const existingIndex = this.findExistingLock(struct.type, box)
    
    if (existingIndex !== null) {
      this.unlockStructure(struct.type, existingIndex, box)
    } else {
      this.lockStructure(struct, box)
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
  unlockStructure(type, index, box) {
    const region = this.state.lockedRegions[type][index]

    // remove tiles from locked display
    this.regions.clearRegion(box, this.state.lockedTiles)
    
    // remove outline rect
    this.display.removeLockRect(region.index)
    
    // remove from tracked locked regions
    this.state.lockedRegions[type].splice(index, 1)
    
    // erase struct on sketch canvas
    this.dispatchSketchEvent('phaserErase', type, box)
  }
  
  // locks a structure
  lockStructure(struct, box) {
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
    this.dispatchSketchEvent('mapToSketch', struct.type, box)
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
            x: box.topLeft.x * this.tileSize + 1,
            y: box.topLeft.y * this.tileSize + 1
          },
          bottomRight: {
            x: br.x * this.tileSize - 1,
            y: br.y * this.tileSize - 1
          }
        }
      }
    })
    
    window.dispatchEvent(event)
  }
}

//*** MAIN SCENE ***//
export default class Autotiler extends Phaser.Scene {
  constructor() {
    super("autotilerScene")
  }
  
  preload() {
    this.load.setPath("./assets/")
    this.load.image("tilemap", "tinyTown_Tilemap_Packed.png")
    this.load.tilemapTiledJSON("tinyTownMap", "maps/map1.tmj")
    this.load.image("colorTiles", "colorTilemap_Packed.png")
  }
  
  create() {
    this.initializeConfig()
    this.initializeManagers()
    this.initializeModels()
    this.initializeGenerators()
    
    this.setupUIControls()
    this.setupEventListeners()
    
    // hide demo elements
    document.getElementById("wfc-demo").classList.add("hidden")
    document.getElementById("pattern-panel").classList.add("hidden")
  }
  
  initializeConfig() {
    // load tileset info
    const tilesetInfo = TILEMAP["tiny_town"]
    this.height = tilesetInfo.HEIGHT
    this.width = tilesetInfo.WIDTH
    this.tileSize = tilesetInfo.TILE_WIDTH

    // init toggle state
    // this.lockingAll = document.getElementById("structure-lock").checked || false
  }
  
  // makes new manager objects (from classes above)
  initializeManagers() {
    this.state = new StateManager(this.width, this.height)
    this.displayManager = new DisplayManager(this, this.tileSize)
    this.regionManager = new RegionManager(this.width, this.height)
    this.clickHandler = new LockHandler(
      this.state,
      this.displayManager,
      this.regionManager,
      this.tileSize
    )
  }
  
  // WFC initialization
  initializeModels() {
    this.groundModel = new WFCModel().learn(IMAGES.GROUND, 2)
    this.structsModel = new WFCModel().learn([...IMAGES.STRUCTURES, ...IMAGES.HOUSES], 2)
    
    this.multiLayerMap = this.add.tilemap("tinyTownMap", this.tileSize, this.tileSize, 40, 25)
    this.tileset = this.multiLayerMap.addTilesetImage("kenney-tiny-town", "tilemap")
  }
  
  // make this.generator object
  initializeGenerators() {
    this.generators = {
      house: (region) => generateHouse({ width: region.width, height: region.height }),
      path: (region) => console.log("TODO: link path generator", region),
      fence: (region) => generateFence({ width: region.width, height: region.height }),
      forest: (region) => generateForest({ width: region.width, height: region.height })
    }
  }
  
  setupUIControls() {
    // EXPORT
    const exportBtn = document.getElementById("export-map-button")
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.export("map"))
      exportBtn.disabled = true
    }
    
    // OVERLAY TOGGLE
    const overlayToggle = document.getElementById('overlay-toggle')
    if (overlayToggle) {
      overlayToggle.onclick = () => {
        this.displayManager.setLayoutVisibility(overlayToggle.checked)
      }
    }
    
    // STRUCT LOCK TOGGLE
    // const lockToggle = document.getElementById("structure-lock")
    // if (lockToggle) {
      // lockToggle.onclick = () => {
        // this.lockingAll = lockToggle.checked
      // }
    // }
    
    // CANVAS CLICK
    const canvas = document.getElementById("phaser")
    if (canvas) {
      canvas.onclick = (e) => this.clickHandler.handleClick(e)
    }
  }
  
  // link event listeners to handler functions
  setupEventListeners() {
    window.addEventListener("generate", (e) => this.handleGenerate(e))
    window.addEventListener("clearSketch", (e) => this.handleClearSketch(e))
    window.addEventListener("undoSketch", (e) => this.handleUndoSketch(e))
    window.addEventListener("redoSketch", (e) => this.handleRedoSketch(e))
  }
  
  //*** EVENT HANDLER FUNCTIONS ***/
  // generate button clicked
  handleGenerate(e) {
    // get user regions from sketch
    this.state.userRegions = new Regions(e.detail.sketch, e.detail.structures, this.tileSize).get()
    this.state.layout = null
    
    this.createGroundMap()
    this.state.wfcResult = this.generate(this.state.userRegions)  // WFC
    
    if (this.state.wfcResult) {
      const pathLayer = generatePaths(this.state.wfcResult)
      
      // display layers
      this.displayManager.displayMap('paths', pathLayer, 'tilemap')
      this.displayManager.displayMap('structs', this.state.wfcResult, 'tilemap')
      this.displayManager.displayMap('sketch', this.state.userTiles, 'tilemap', 1, 1)
      this.displayManager.displayMap('locked', this.state.lockedTiles, 'tilemap', 1, 1)
      
      // display layout if it exists and toggle is checked
      if (this.state.layout) {
        this.displayManager.displayMap('layout', this.state.layout.layoutMap, 'colorTiles', 0.25)
        const overlayToggle = document.getElementById('overlay-toggle')
        this.displayManager.setLayoutVisibility(overlayToggle.checked || false)
      }

      // enable map export
      const exportBtn = document.getElementById("export-map-button")
      exportBtn.disabled = false
    }

    this.displayManager.showLockRects()
  }
  
  // clear button clicked
  handleClearSketch(e) {
    this.state.userRegions = new Regions(e.detail.sketch, e.detail.structures, this.tileSize).get()
    this.state.resetLockedTiles()
    
    this.displayManager.clearDisplay('paths')
    this.displayManager.clearDisplay('locked')
    this.displayManager.clearDisplay('sketch')
    this.displayManager.clearDisplay('structs')
    this.displayManager.setLayoutVisibility(false)

    // disable map export
    const exportBtn = document.getElementById("export-map-button")
    exportBtn.disabled = true
  }
  
  // undo button clicked
  handleUndoSketch(e) {
    // save current (pre-undo) user regions from sketch, then parse new regions
    const previousRegions = this.state.userRegions  
    this.state.userRegions = new Regions(e.detail.sketch, e.detail.structures, this.tileSize).get()
    
    // clear removed regions from phaser canvas
    const removedRegions = this.regionManager.findRemovedRegions(previousRegions, this.state.userRegions)
    for (let region of removedRegions) {
      this.regionManager.clearRegion(region, this.state.lockedTiles)      // unlock any locked tiles in region
      this.regionManager.clearRegion(region, this.state.layout.layoutMap) // remove from layout
      
      if (this.state.lockedRegions[region.type]) {
        // remove from locked regions
        this.state.lockedRegions[region.type] = this.state.lockedRegions[region.type].filter(
          box => !this.regionManager.regionsMatch(box, region)
        )
        
        // clean up
        if (this.state.lockedRegions[region.type].length === 0) {
          delete this.state.lockedRegions[region.type]
        }
      }
    }
    
    // now display current/updated regions
    this.displayManager.displayMap('sketch', this.state.lockedTiles, 'tilemap', 1, 1)
    this.displayManager.displayMap('layout', this.state.layout.layoutMap, 'colorTiles')
    
    const overlayToggle = document.getElementById('overlay-toggle')
    this.displayManager.setLayoutVisibility(overlayToggle.checked || false)

    this.displayManager.showLockRects()
  }
  
  // redo button clicked
  // TODO: re-draw ??
  handleRedoSketch(e) {
    this.state.userRegions = new Regions(e.detail.sketch, e.detail.structures, this.tileSize).get()
  }
  
  //*** GENERATION ***//
  generate(regions) {
    if (this.state.layout) delete this.state.layout
    
    // 2-pass hierarchical approach
    // first, generate layout using WFC layout model
    this.state.layout = generateLayout(regions, "tiny_town", "color_blocks", 2)
    
    // then, fill layout regions with tiles
    const map = this.generateTilemapFromLayout(this.state.layout)
    return map
  }
  
  // second, higher-fidelity pass in hierarchical approach 
  generateTilemapFromLayout(layout) {
    let tilemapImage = Array.from({ length: this.height }, () => Array(this.width).fill(-1))
    
    // loop through regions in layout
    for (let structure of layout.worldFacts) {
      let region = structure.boundingBox
      
      // check if region is locked already
      if (this.regionManager.regionOverlap(region, this.state.lockedRegions)) {
        // console.log(structure)
        const struct = this.regionManager.getRegionFromMap(region, this.state.lockedTiles)
        this.regionManager.copyRegionTiles(region, struct, tilemapImage)  // get tiles and skip WFC call
        continue
      }
      
      // WFC: call region-specific model
      const gen = this.generators[structure.type](region)
      
      if (!gen) {
        console.warn(`Structure generation failed: ${structure.type} at (${region.topLeft.x}, ${region.topLeft.y})`)
        continue  // if failed, give console warning but continue on
      }
      
      // put generated tiles in final tilemap 
      this.regionManager.copyRegionTiles(region, gen, tilemapImage)
    }
    
    return tilemapImage
  }
  
  // generates background (ground) layer (in one pass, no hierarchical approach here)
  createGroundMap() {
    const image = this.groundModel.generate(this.width, this.height, 10, false, false)
    if (!image) throw new Error("Contradiction created")
    
    if (this.displayManager.displays.ground) {
      // console.log("destroying old ground")
      this.displayManager.displays.ground.map.destroy()
      this.displayManager.displays.ground.layer.destroy()
    }
    
    const groundMap = this.make.tilemap({
      data: image,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    })
    const layer = groundMap.createLayer(0, this.tileset, 0, 0)

    this.displayManager.displays.ground = {
      map: groundMap,
      layer: layer
    }
    
    this.state.groundImage = image
  }
  
  //*** EXPORTING ***//
  async export(key) {
    const zip = JSZip()
    
    switch (key) {
      case "map":
        await this.exportMap(zip)
        break
      case "all":
        await this.exportMap(zip)
        await exportSketch(zip)
        break
    }
    
    const blob = await zip.generateAsync({ type: "blob" })
    saveAs(blob, `sketchtiler_export_${key}.zip`)
  }
  
  async exportMap(zip) {
    zip.file("tilemapData.json", JSON.stringify({
      ground: this.convertToSignedArray(this.state.groundImage),
      structures: this.convertToSignedArray(this.state.wfcResult)
    }))
    
    // make it pretty
    this.displayManager.hideLockRects()
    const prevAlpha = {
      structs: this.displayManager.displays.structs.layer.alpha,
      layout: this.displayManager.displays.layout.layer.alpha,
    }
    this.displayManager.displays.structs.layer.setAlpha(1)
    this.displayManager.displays.layout.layer.setAlpha(0)

    await new Promise(resolve => setTimeout(resolve, 10)) // wait a moment (for canvas to reflect changes)
    
    // capture canvas as an image
    const canvas = window.game.canvas
    const dataURL = canvas.toDataURL("image/PNG")
    const base64Data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")
    
    // download
    zip.file("tilemapImage.png", base64Data, { base64: true })
    
    // only allow exports when something is new 
    const exportBtn = document.getElementById("export-map-button")
    if (exportBtn) exportBtn.disabled = true

    // restore
    this.displayManager.displays.structs.layer.setAlpha(prevAlpha.structs)
    this.displayManager.displays.layout.layer.setAlpha(prevAlpha.layout)
    this.displayManager.showLockRects()
  }
 
  // helper to convert from unsigned to signed
  convertToSignedArray(arr) {
    return arr.map(row => row.map(v => v | 0))
  }
}