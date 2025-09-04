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
document.getElementById("instructions").classList.add("hidden");

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
      if(this.metaTileLayer){ 
        this.metaTileLayer.setVisible(this.overlayToggle.checked);
        if(!this.overlayToggle.checked) this.displayPatterns(this.structsModel.patterns, "tilemap", 1);
        else this.displayPatterns(this.metaModel.patterns, "colorTiles");
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

  generateMetaMap(){
    console.log("Using model for meta tiles");
    const metaImage = this.metaModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!metaImage) return;

    document.getElementById("thinking-icon").style.display = "none"; // hide

    return metaImage;
  }

  generateMap(scene){
    let my = scene; // using my in place of this so it can be passed through benchmarking functions

    my.displayPatterns(my.structsModel.patterns, "tilemap", 1);
    
    // generate ground
    console.log("Using model for ground");
    const groundImage = my.groundModel.generate(my.width, my.height, my.maxAttempts, my.logProgress, my.profileSolving, my.logProfile);
    if (!groundImage) return;

    // generate a meta map (layout) 
    let metaImage = my.generateMetaMap();

    // return performance profiles for models used
    if(my.profileSolving){
      // parse generated layout
      let wfcLayout = new Layout(
        metaImage,
        my.minStructreSize, 
        STRUCTURE_TILES["color_blocks"]
      );

      // use generated layout to generate and place structres in a complete tilemap
      const tilemapImage = my.generateTilemapFromLayout(wfcLayout);

      // show tiled version
      my.displayMap(my.groundMap, groundImage, "tilemap");
      my.displayMap(my.structuresMap, tilemapImage, "tilemap");

      // show color block version
      my.displayMetaLayer(metaImage, "colorTiles", false); // make new color blocked layer

      return {
        metaTiles: my.metaModel.performanceProfile,
      }
    }
  }

  generateTilemap(layout){
    let tilemapImage = Array.from({ length: this.height }, () => Array(this.width).fill(-1)); // empty map
      
    // generate all structures in layout
    for(let structure of layout.worldFacts){
      //console.log(`generating a ${structure.type}...`)

      let region = structure.boundingBox;
      const gen = this.generator[structure.type](region);

      if(!gen) continue;
      //console.log(`${structure.type} generation complete`)

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
  
  displayMap(groundImage, structuresImage, tilesetName, gid = 1) {
    if (this.groundMap) this.groundMap.destroy();
    if (this.structuresMap) this.structuresMap.destroy();

    this.groundMap = this.make.tilemap({
      data: groundImage,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });
    
    this.structuresMap = this.make.tilemap({
      data: structuresImage,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    let tileset = this.structuresMap.addTilesetImage("tileset", tilesetName, 16, 16, 0, 0, gid);
    
    this.groundMap.createLayer(0, tileset, 0, 0, 1);
    this.structuresMap.createLayer(0, tileset, 0, 0, 1);

    for (const layer of this.multiLayerMapLayers) layer.setVisible(false);
  }	

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

  clearMap(){
    for (const layer of this.multiLayerMapLayers) layer.setVisible(true);
    if (this.groundMap) this.groundMap.destroy();
    if (this.structuresMap) this.structuresMap.destroy();
  }

  learnLayout(structures_id, displayLayout = -1){
    let layouts = []

    // create layouts from structure maps
    for(let structureMap of IMAGES.STRUCTURES){
      const mapLayout = new Layout(
        structureMap,
        this.minStructreSize, 
        STRUCTURE_TILES[structures_id]
      );

      layouts.push(mapLayout.getLayoutMap());
    }

    // train meta map model on layout maps
    this.metaModel = new WFCModel().learn(layouts, this.N, this.profileLearning, this.printPatterns);

    // display
    if(displayLayout > 0){
      this.displayMetaLayer(layouts[displayLayout], "colorTiles"); // display color blocked layout
    }
  }

  displayMetaLayer(layoutMap, tilesetName, vis = true){
    if(this.metaMap) this.metaMap.destroy();

    this.metaMap = this.make.tilemap({
      data: layoutMap,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    let tiles = this.metaMap.addTilesetImage("colors", tilesetName);
    this.metaTileLayer = this.metaMap.createLayer(0, tiles, 0, 0);
    this.metaTileLayer.setVisible(vis);

    // allow toggling of color block overlay
    this.overlayToggle.disabled = false;
    this.overlayToggle.checked = vis;

    // show layout patterns in pattern window
    if(vis) this.displayPatterns(this.metaModel.patterns, "colorTiles");
  }
}