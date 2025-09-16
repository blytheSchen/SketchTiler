import Phaser from "../../../lib/phaserModule.js";
import WFCModel from "../../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../../2_WFC/2_Input/images.js";
import generateHouse from "../../3_Generators/generateHouse.js";
import generateForest from "../../3_Generators/generateForest.js";
import generateFence from "../../3_Generators/generateFence.js";
import Layout from "../../5_Utility/getWorldLayout.js";
import STRUCTURE_TILES from "../structureTiles.js";
import BENCHMARK from "../../5_Utility/Benchmarking.js";

// hide sketchpad elements
document.getElementById("sketchpad").classList.add("hidden");
document.getElementById("buttons").classList.add("hidden");

export default class WFC extends Phaser.Scene {
  displayedMapID = 3;	// check assets folder to see all maps  

  N = 2;
  tileSize = 16;

  profileLearning = false;
  printPatterns = true;

  // width & height for entire maps should have an 8:5 ratio (e.g. 24x15, 40x25)
  width = 40;
  height = 25;
  maxAttempts = 10;
  logProgress = true;
  profileSolving = true;
  logProfile = false;
  minStructreSize = 2;

  numRuns = 100;	
  printAveragePerformance = true;

  groundModel = new WFCModel().learn(IMAGES.GROUND, this.N, this.profileLearning, this.printPatterns);
  structsModel = new WFCModel().learn(IMAGES.STRUCTURES, this.N, this.profileLearning, this.printPatterns);

  /**
   * Structure generators keyed by type.
   * @type {Object<string, function(Object): number[][]>}
   */
  generator = {
    house: (region) => generateHouse({width: region.width, height: region.height}),
    path: (region) => console.log("TODO: link path generator", region),
    fence: (region) => generateFence({width: region.width, height: region.height}),
    forest: (region) => generateForest({width: region.width, height: region.height})
  };

  constructor() {
    super("wfcTestingScene");
  }

  preload() {
    this.load.setPath("./assets/");
    this.load.image("tilemap", "tinyTown_Tilemap_Packed.png");
    this.load.tilemapTiledJSON("tinyTownMap", `maps/map${this.displayedMapID}.tmj`);

    this.load.image("colorTiles", "colorTilemap_Packed.png");
  }

  create() {
    this.showInputImage();
    this.setupControls();

    this.learnLayout("tiny_town", 2);
  }

  /**
   * Display the loaded Tiled map in Phaser.
   * @private
   */
  showInputImage() {
    this.multiLayerMap = this.add.tilemap("tinyTownMap", 16, 16, 40, 25);
    this.tileset = this.multiLayerMap.addTilesetImage("kenney-tiny-town", "tilemap");

    if (this.displayedMapID === 1) {
      this.groundLayer = this.multiLayerMap.createLayer("Ground-n-Walkways", this.tileset, 0, 0);
      this.treesLayer = this.multiLayerMap.createLayer("Trees-n-Bushes", this.tileset, 0, 0);
      this.housesLayer = this.multiLayerMap.createLayer("Houses-n-Fences", this.tileset, 0, 0);
      this.multiLayerMapLayers = [this.groundLayer, this.treesLayer, this.housesLayer];
    } else {
      this.groundLayer = this.multiLayerMap.createLayer("Ground", this.tileset, 0, 0);
      this.structuresLayer = this.multiLayerMap.createLayer("Structures", this.tileset, 0, 0);
      this.multiLayerMapLayers = [this.groundLayer, this.structuresLayer];
    }
  }

  /**
   * Setup DOM buttons and keyboard controls for the scene.
   * @private
   */
  setupControls() {
    /* GENERATE */
    document.getElementById("generateBtn").addEventListener("click", async () => 
      BENCHMARK.runWithSpinner(async () => await BENCHMARK.getAverageGenerationDuration(this.generateMap, this, 1, this.printAveragePerformance))
    );
    
    /* CLEAR */
    document.getElementById("clearBtn").addEventListener("click", () => this.clearMap());
    
    /* LAYOUT DISPLAY */
    this.overlayToggle = document.getElementById('overlay-toggle');
    this.overlayToggle.addEventListener("click", () => {
      if(this.layoutLayer){ 
        this.layoutLayer.setVisible(this.overlayToggle.checked);
        if(!this.overlayToggle.checked) this.displayPatterns(this.structsModel.patterns, "tilemap", 1);
        else this.displayPatterns(this.layoutModel.patterns, "colorTiles");
      }
    });

    /* GET AVERAGE */
    document.getElementById("numRunsInput").value = 100;
    document.getElementById("numRunsInput").addEventListener("change", (e) => {
      this.numRuns = parseInt(e.target.value);
    });
    document.getElementById("averageBtn").addEventListener("click", async () => 
      BENCHMARK.runWithSpinner(async () => await BENCHMARK.getAverageGenerationDuration(this.generateMap, this, this.numRuns, this.printAveragePerformance))
    );

    /* LEGACY KEYS */
    this.runWFC_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.runWFC_Key.on("down", () => 
      BENCHMARK.runWithSpinner(async () => await BENCHMARK.getAverageGenerationDuration(this.generateMap, this, 1, this.printAveragePerformance))
    );

    this.clear_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.clear_Key.on("down", () => this.clearMap());

    this.timedRuns_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.timedRuns_Key.on("down", async () => 
      await BENCHMARK.getAverageGenerationDuration(this.generateMap, this, this.numRuns, this.printAveragePerformance)
    );
  }

  /**
   * Train layout model on structure layouts.
   * 
   * @param {string} structuresID - Key for STRUCTURE_TILES to use.
   * @param {number} [displayLayout=-1] - Index of layout to display, or -1 to skip.
   */
  learnLayout(structuresID, displayLayout = -1){
    let layouts = []

    // create layouts from structure maps
    for(let structureMap of IMAGES.STRUCTURES){
      const mapLayout = new Layout(
        structureMap,
        this.minStructreSize, 
        STRUCTURE_TILES[structuresID]
      );

      layouts.push(mapLayout.getLayoutMap());
    }

    // train layout map model on layout maps
    this.layoutModel = new WFCModel().learn(layouts, this.N, this.profileLearning, this.printPatterns);

    // display
    if(displayLayout > 0){
      this.displayLayout(layouts[displayLayout], "colorTiles"); // display color blocked layout
    }
  }

  /**
   * Generate a map using HSWFC.
   * First, generate the ground as a separate, backgound layer.
   * Next, generate a map layout using the pretrained layout model.
   * Then, call tile-based structure generators on each structure in the generated layout, and place those structures in the world map.
   * Finally, display the finished world.
   * 
   * @param {WFC} scene - Current WFC scene instance. Using in place of this so function may be ran though benchmarking functions.
   * @returns {Object|undefined} Performance profiles if profiling is enabled.
   */
  generateMap(scene){
    let my = scene; // using my in place of this so it can be passed through benchmarking functions

    my.displayPatterns(my.structsModel.patterns, "tilemap", 1);

    // generate ground
    console.log("Using model for ground");
    const groundImage = my.groundModel.generate(my.width, my.height, my.maxAttempts, my.logProgress, my.profileSolving, my.logProfile);
    if (!groundImage) return;

    // generate a layout map (layout) 
    let layoutImage = my.generateLayout();

    // return performance profiles for models used
    if(my.profileSolving){
      // parse generated layout
      let wfcLayout = new Layout(
        layoutImage,
        my.minStructreSize, 
        STRUCTURE_TILES["color_blocks"]
      );

      // use generated layout to generate and place structres in a complete tilemap
      const tilemapImage = my.generateTilemapFromLayout(wfcLayout);

      // show tiled version
      my.displayMap("groundMap", groundImage, "tilemap");
      my.displayMap("structuresMap", tilemapImage, "tilemap");

      // show color block version
      my.displayLayout(layoutImage, "colorTiles", false); // make new color blocked layer

      return {
        layoutTiles: my.layoutModel.performanceProfile,
      }
    }
  }  
  
  /**
   * Generate a layout map using the layout WFC model.
   * This is the highest hierarchical level of our generation pipeline, sketching out a world with structures (but not including any structural details).
   * 
   * @returns {number[][]|undefined} The generated layout as a 2D array.
   */
  generateLayout(){
    console.log("Using model for layout tiles");
    const layoutImage = this.layoutModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!layoutImage) return;

    document.getElementById("thinking-icon").style.display = "none"; // hide

    return layoutImage;
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
      const gen = this.generator[structure.type](region);

      if(!gen) continue;  // if structure generation fails, just move on

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
  
  /**
   * Display a 2D tiles array as a Phaser Tilemap.
   * 
   * @param {Phaser.Tilemaps.Tilemap} map - Existing tilemap (will be destroyed and remade).
   * @param {number[][]} tilesArray - 2D array of tile IDs.
   * @param {string} tilesetName - Tileset key loaded in Phaser.
   * @param {number} [gid=1] - Tile ID offset (firstgid).
   */
  displayMap(mapKey, tilesArray, tilesetName, gid = 1) {
    if (this[mapKey]) {
      // destroy old version of map
      this[mapKey].removeAllLayers(); 
      this[mapKey].destroy();
      this[mapKey] = null;
    }   

    this[mapKey] = this.make.tilemap({ // make a new tilemap using tiles array
      data: tilesArray,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    // make a layer to make new map visible
    let tileset = this[mapKey].addTilesetImage("tileset", tilesetName, 16, 16, 0, 0, gid);
    this[mapKey].createLayer(0, tileset, 0, 0, 1);
  }	

  /**
   * Display a layout map as a color-blocked overlay.
   * 
   * @param {number[][]} layoutMap - Layout tiles.
   * @param {string} tilesetName - Tileset to use for color tiles.
   * @param {boolean} [vis=true] - Whether to show the overlay immediately.
   */
  displayLayout(layoutMap, tilesetName, vis = true){
    if(this.layoutMap) this.layoutMap.destroy();

    this.layoutMap = this.make.tilemap({
      data: layoutMap,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    let tiles = this.layoutMap.addTilesetImage("colors", tilesetName);
    this.layoutLayer = this.layoutMap.createLayer(0, tiles, 0, 0);
    this.layoutLayer.setVisible(vis);

    // allow toggling of color block overlay
    this.overlayToggle.disabled = false;
    this.overlayToggle.checked = vis;

    // show layout patterns in pattern window
    if(vis) this.displayPatterns(this.layoutModel.patterns, "colorTiles");
  }

  /**
   * Render pattern previews into the pattern panel.
   * 
   * @param {number[][][]} patterns - List of NxN pattern matrices.
   * @param {string} tilesetName - Tileset used for drawing.
   * @param {number} [indexOffset=0] - Offset for tile indices.
   */
  displayPatterns(patterns, tilesetName, indexOffset = 0) {
    this.tilesetImage = this.textures.get(tilesetName).getSourceImage();
    this.tilesetColumns = this.tilesetImage.width / this.tileSize;

    const panel = document.getElementById('pattern-panel');
    panel.innerHTML = ''; // clear old patterns

    patterns.forEach((pattern, index) => {
      // create an offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = this.N * this.tileSize;
      canvas.height = this.N * this.tileSize;
      const ctx = canvas.getContext('2d');

      // draw tiles 
      pattern.forEach((row, y) => {
        row.forEach((tileIndex, x) => {
          tileIndex -= indexOffset;
          const tileX = tileIndex % this.tilesetColumns; // tileset columns
          const tileY = Math.floor(tileIndex / this.tilesetColumns);
          ctx.drawImage(
            this.tilesetImage, // HTMLImageElement from phaser loader
            tileX * this.tileSize, tileY * this.tileSize, 
            this.tileSize, this.tileSize,
            x * this.tileSize, y * this.tileSize, 
            this.tileSize, this.tileSize
          );
        });

        ctx.strokeStyle = "#fff"; // white border (change as needed)
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      });

      // Append to panel
      panel.appendChild(canvas);
    });
  }

  /**
   * Clear generated maps and reset visibility to original input layers.
   */
  clearMap(){
    if (this.groundMap) this.groundMap.destroy();
    if (this.structuresMap) this.structuresMap.destroy();

    for (const layer of this.multiLayerMapLayers) layer.setVisible(true);
  }
}