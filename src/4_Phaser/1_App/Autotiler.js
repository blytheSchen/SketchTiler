// TODO
//  - better comments (JSDoc) 
//  - ***structure regen?? right-click structures in phaser canvas to regenerate just that one structure
//    - lean in to the hierarchical appraoch more!
// BUGS
//  - fix undo/redo bugs after unlocking a locked region
//      - puts empty tiles atm :( should probably replace removes tiles which means more state tracking in phaser yayyyy
//      - only sometimes puts empty?? why  
//      - click to unlock -> undo -> empty
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

// import managers
import StateManager from "./1_Classes/StateManager.js"
import DisplayManager from "./1_Classes/DisplayManager.js"
import RegionManager from "./1_Classes/RegionManager.js"
import LockManager from "./1_Classes/LockManager.js"

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
    this.initializeModels()
    this.initializeGenerators()
    this.initializeManagers()
    
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
    this.regionManager = new RegionManager(this.state, this.tileSize)
    this.lockHandler = new LockManager(
      this.state,
      this.displayManager,
      this.regionManager
    )

    this.regionManager.lockManager = this.lockHandler
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
    
    // CANVAS CLICKS
    let ctrl = false;
    this.input.keyboard.on('keydown', function (e) {
      ctrl = (e.key === "Control")
    })
    const canvas = document.getElementById("phaser")
    if (canvas) {
      canvas.onclick = (e) => this.regionManager.handleClick(e, ctrl)
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

    this.lockHandler.unlockAll()

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
        console.log(region)
        const b = { topLeft: region.topLeft, bottomRight: region.bottomRight }
        const i = this.lockHandler.findExistingLock(region.type, b)

        this.lockHandler.unlockStructure(region.type, i, b)

        // this.state.lockedRegions[region.type] = this.state.lockedRegions[region.type].filter(
          // box => !this.regionManager.regionsMatch(box, region)
        // )
        
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