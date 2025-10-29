import Phaser from "../../lib/phaserModule.js";
import TILEMAP from "./tilemap.js";
import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import generateHouse from "../3_Generators/generateHouse.js";
import generateForest from "../3_Generators/generateForest.js";
import generateFence from "../3_Generators/generateFence.js";
import generatePaths from "../3_Generators/generatePaths.js";
import { Regions } from "../1_Sketchpad/1_Classes/regions.js";
import { exportSketch } from "../1_Sketchpad/sketchpad.js";
import generateLayout from "../3_Generators/generateLayout.js";

// hide demo elements
document.getElementById("wfc-demo").classList.add("hidden");
document.getElementById("pattern-panel").classList.add("hidden");

// structure locking
const lockToggle = document.getElementById("structure-lock");
let lockingAll = lockToggle.checked;
lockToggle.onclick = () => {
  lockingAll = document.getElementById("structure-lock").checked;
}

const SUGGESTED_TILE_ALPHA = 0.5;  // must be between 0 and 1
const tilesetInfo = TILEMAP["tiny_town"];

export default class Autotiler extends Phaser.Scene {
  constructor() {
    super("autotilerScene");
  }

  preload() {
    this.load.setPath("./assets/");
    this.load.image("tilemap", "tinyTown_Tilemap_Packed.png");
    this.load.tilemapTiledJSON("tinyTownMap", `maps/map1.tmj`);
  }

  create() {
    this.height = tilesetInfo.HEIGHT;
    this.width = tilesetInfo.WIDTH;
    this.tileSize = tilesetInfo.TILE_WIDTH;

    this.multiLayerMap = this.add.tilemap("tinyTownMap", this.tileSize, this.tileSize, 40, 25);
    this.tileset = this.multiLayerMap.addTilesetImage("kenney-tiny-town", "tilemap");

    this.groundModel = new WFCModel().learn(IMAGES.GROUND, 2);
    this.structsModel = new WFCModel().learn([...IMAGES.STRUCTURES, ...IMAGES.HOUSES], 2);

    // make an empty results array with same dims as tilemap
    this.userTiles = Array.from({ length: this.height }, () => Array(this.width).fill(-1)); // 2D array of empty tiles
    this.drawnUserRegion = {};
    this.userStructureCount = 0;

    this.generator = {
      house: (region) => generateHouse({width: region.width, height: region.height}),
      path: (region) => console.log("TODO: link path generator", region),
      fence: (region) => generateFence({width: region.width, height: region.height}),
      forest: (region) => generateForest({width: region.width, height: region.height})
    };

    // exports
    this.exportMapButton = document.getElementById("export-map-button");
    this.exportMapButton.addEventListener("click", async () => this.export("map"));
    this.exportMapButton.disabled = true;

    window.addEventListener("generate", (e) => {
      this.sketch = e.detail.sketch;
      this.structures = e.detail.structures;
      this.userRegions = new Regions(this.sketch, this.structures, this.tileSize).get();

      this.createGroundMap()
      const result = this.generate(this.userRegions);

      if(result){
        // saves tiles generated from user sketch to an array
        const regionCount = this.countRegions();
        
        // update user tiles for all current regions, checking what's new or changed
        this.updateUserStructArray(this.userTiles, result, this.userRegions);
        this.userStructureCount = regionCount;

        const pathLayer = generatePaths(result);

        // draw suggestion layers at half opacity
        this.pathsDisplay = this.displayMap(this.pathsDisplay, pathLayer, "tilemap");
        this.structsDisplay = this.displayMap(this.structsDisplay, result, "tilemap");
        // redraw user-sketched regions on top at full opacity
        this.sketchDisplay = this.displayMap(this.sketchDisplay, this.userTiles, "tilemap", 1, 1);

        // TODO: STRUCTURE LOCKING
        //    - add a locking/unlocking button or toggle
        //        - put under tilemap ("lock all", "lock selected" <- ?)
      }
    });

    window.addEventListener("clearSketch", (e) => {
      this.sketch = e.detail.sketch;
      this.structures = e.detail.structures;
      this.userRegions = new Regions(this.sketch, this.structures, this.tileSize).get();
      
      // make an empty results array with same dims as tilemap
      this.userTiles = Array.from({ length: this.height }, () => Array(this.width).fill(-1)); // 2D array of empty tiles
      this.drawnUserRegion = {};
      this.userStructureCount = 0;
        
      if (this.sketchDisplay) {
        this.sketchDisplay.map.destroy();     // destroy old version of map
        this.sketchDisplay.layer.destroy();   // clear old layer
      }

      if (this.structsDisplay) {
        this.structsDisplay.map.destroy();    // destroy old version of map
        this.structsDisplay.layer.destroy();  // clear old layer
      }
    });

    window.addEventListener("undoSketch", (e) => {
      const previousRegions = this.userRegions; // save old regions
      
      this.sketch = e.detail.sketch;
      this.structures = e.detail.structures;
      this.userRegions = new Regions(this.sketch, this.structures, this.tileSize).get();

      const removedRegions = this.findRemovedRegions(previousRegions, this.userRegions);
      
      // clear removed regions from userTiles and drawnUserRegion
      for (let region of removedRegions) {
        // clear removed userTiles
        for (let y = region.topLeft.y; y < region.topLeft.y + region.height; y++) {
          for (let x = region.topLeft.x; x < region.topLeft.x + region.width; x++) {
            this.userTiles[y][x] = -1; // set to empty
          }
        }
        
        // clear removed drawnUserRegions
        if (this.drawnUserRegion[region.type]) {
          this.drawnUserRegion[region.type] = this.drawnUserRegion[region.type].filter(
            box => !this.regionsMatch(box, region)
          );
          
          // clean up empty arrays
          if (this.drawnUserRegion[region.type].length === 0) {
            delete this.drawnUserRegion[region.type];
          }
        }
      }
      
      this.userStructureCount = this.countRegions();
      
      this.sketchDisplay = this.displayMap(this.sketchDisplay, this.userTiles, "tilemap", 1, 1);
    });

    window.addEventListener("redoSketch", (e) => {
      this.sketch = e.detail.sketch;
      this.structures = e.detail.structures;
      this.userRegions = new Regions(this.sketch, this.structures, this.tileSize).get();
    });
  }

  // calls generators
  generate(regions, sketchImage) {
    // complete layout from user sketch data
    let layout = generateLayout(
      regions, 
      "tiny_town", 
      "color_blocks", 
      2/*, 
      true*/
    );

    // call structure generators on each region in completed layout
    let map = this.generateTilemapFromLayout(layout);

    // return completed tilemap
    return map;
  }

  createGroundMap() {
    const image = this.groundModel.generate(tilesetInfo.WIDTH, tilesetInfo.HEIGHT, 10, false, false);
    if (!image) throw new Error("Contradiction created");
    
    if (this.groundMap) this.groundMap.destroy();
    this.groundMap = this.make.tilemap({
      data: image,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });
    this.groundMap.createLayer(0, this.tileset, 0, 0);

    this.groundImage = image;   // for exports
  }

  /**
   * Display a 2D tiles array as a Phaser Tilemap.
   * 
   * @param {Phaser.Tilemaps.Tilemap} display - Existing tilemap (will be destroyed and remade).
   * @param {number[][]} tilesArray - 2D array of tile IDs.
   * @param {string} tilesetName - Tileset key loaded in Phaser.
   * @param {number} [gid=1] - Tile ID offset (firstgid).
   */
  displayMap(display, tilesArray, tilesetName, gid = 1, opacity = SUGGESTED_TILE_ALPHA) {
    if (display) {
      display.map.destroy();   // destroy old version of map
      display.layer.destroy();   // clear old layer
    }

    display = {
      map: this.make.tilemap(
        { // make a new tilemap using tiles array
          data: tilesArray,
          tileWidth: this.tileSize,
          tileHeight: this.tileSize
        }),
      layer: null
    };

    // make a layer to make new map visible
    let tileset = display.map.addTilesetImage("tileset", tilesetName, 16, 16, 0, 0, gid);
    display.layer = display.map.createLayer(0, tileset, 0, 0, 1);
    display.layer.alpha = opacity;

    return display;
  }	

  async exportMap(zip){
    // add map data to the zip
    zip.file("tilemapData.json", JSON.stringify({
      ground: this.convertToSignedArray(this.groundImage),
      structures: this.convertToSignedArray(this.exportImage)
    }));

    // make suggestions full opacity
    this.suggestionsLayer.setAlpha(1);

    // slight pause so canvas snapshot (below) reflects full opacity suggestions
    await new Promise(resolve => setTimeout(resolve, 10)); 

    // add map image to the zip
    const canvas = window.game.canvas;
    const dataURL = canvas.toDataURL("image/PNG")
    const base64Data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");

    zip.file("tilemapImage.png", base64Data, { base64: true });

    this.exportMapButton.disabled = true;
  }

  async export(key){
    const zip = JSZip();

    switch(key){
      case "map":
        await this.exportMap(zip);
        break;
      case "all":
        await this.exportMap(zip);
        await exportSketch(zip);
        break;
    }
    
    // generate zip
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `sketchtiler_export_${key}.zip`);
  }

  // converts unsigned ints back to signed 
  convertToSignedArray(arr){
    let signed2D = arr.map(row =>
      row.map(v => v | 0)   // force into signed 32-bit space
    );

    return signed2D;
  }

   /**
   * Build a full tilemap from a generated layout.
   * Calls structure generator for each structure in the layout, then places them in a 2D array.
   * 
   * @param {Layout} layout - Layout object containing world facts and regions.
   * @returns {number[][]} Generated tilemap.
   */
  generateTilemapFromLayout(layout){
    let tilemapImage = Array.from({ length: this.height }, () => Array(this.width).fill(-1)); // empty map
      
    // generate all structures in layout
    for(let structure of layout.worldFacts){
      let region = structure.boundingBox;
      
      if(lockingAll){
        // check if (a) region is user-defined (sketched) and (b) tiles have already been drawn for the region
        // (for now, skipping generation of these regions by default -- aka user regions are auto-locked)
        if(this.regionOverlap(region, this.userRegions) && this.regionOverlap(region, this.drawnUserRegion)){ 
            for(let y = 0; y < region.height; y++){
              for(let x = 0; x < region.width; x++){
                // place generated structure tiles in tilemapImage
                let dy = region.topLeft.y + y;
                let dx = region.topLeft.x + x;
                
                tilemapImage[dy][dx] = this.userTiles[dy][dx];
              }
            }
          continue;
        }
      }

      const gen = this.generator[structure.type](region);

      if(!gen) { // if structure generation fails, just move on
        console.warn(`Structure generation failed: ${structure.type} at (${region.topLeft.x}, ${region.topLeft.y})`);
        continue;  
      }

      for(let y = 0; y < region.height; y++){
        for(let x = 0; x < region.width; x++){
          // place generated structure tiles in tilemapImage
          let dy = region.topLeft.y + y;
          let dx = region.topLeft.x + x;
          
          tilemapImage[dy][dx] = gen[y][x];
        }
      }
    }

    return tilemapImage;
  }

  updateUserStructArray(userStructArray, tilemap, regions, init = false){
    // looping through regions array, grab tiles from tilemap and put in results map
    // regions = {struct_type: [boundingboxA, boundingboxB, ...], ... }

    for(let type in regions){       // loops thru all drawn structs by type
      let struct = regions[type];
      for(let box of struct){       // loops thru all regions in struct type
        if(init || this.regionOverlap(box, this.userRegions)){
          // using this box, copy tiles from tilemap to result
          for(let x = box.topLeft.x; x < box.topLeft.x + box.width; x++){
            for(let y = box.topLeft.y; y < box.topLeft.y + box.height; y++){
              userStructArray[y][x] = tilemap[y][x];
            }
          }

          if(!this.drawnUserRegion[type]) this.drawnUserRegion[type] = [];
          this.drawnUserRegion[type].push(box);
        }
      }   
    }
  }

  countRegions(){
    let count = 0;

    for(let type in this.userRegions){
      count += this.userRegions[type].length;
    }

    return count;
  }

  regionOverlap(region, regionsObj){
    for(let type in regionsObj){
      let struct = regionsObj[type];

      for(let box of struct){
        const r1Right = region.topLeft.x + region.width;
        const r1Bottom = region.topLeft.y + region.height;
        const r2Right = box.topLeft.x + box.width;
        const r2Bottom = box.topLeft.y + box.height;

        const overlap = (
          region.topLeft.x <= r2Right &&
          r1Right >= box.topLeft.x &&
          region.topLeft.y <= r2Bottom &&
          r1Bottom >= box.topLeft.y
        );

        if (overlap) return true;
      }
    }
    return false;
  }

  findRemovedRegions(oldRegions, newRegions) {
    const removed = [];
    
    for (let type in oldRegions) {
      const oldBoxes = oldRegions[type];
      const newBoxes = newRegions[type] || [];
      
      for (let oldBox of oldBoxes) {
        const stillExists = newBoxes.some(newBox => 
          this.regionsMatch(oldBox, newBox)
        );
        
        if (!stillExists) {
          removed.push({ ...oldBox, type });
        }
      }
    }
    
    return removed;
  }

  regionsMatch(box1, box2) {
    return (
      box1.topLeft.x === box2.topLeft.x &&
      box1.topLeft.y === box2.topLeft.y &&
      box1.width === box2.width &&
      box1.height === box2.height
    );
  }

  getDrawnRegionsFromUserTiles() {
    const drawn = {};
    for (let type in this.userRegions) {
      drawn[type] = [...this.userRegions[type]];
    }
    return drawn;
  }
}
