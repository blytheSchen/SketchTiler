import Phaser from "../../../lib/phaserModule.js";
import WFCModel from "../../2_WFC/1_Model/WFCModel.js";
import IMAGES from "../../2_WFC/2_Input/IMAGES.js";
import generateHouse from "../../3_Generators/generateHouse.js";
import generateForest from "../../3_Generators/generateForest.js";
import Layout from "../../5_Utility/getWorldLayout.js";
import STRUCTURE_TILES from "../structureTiles.js";

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

  numRuns = 100;	// for this.getAverageGenerationDuration()
  printAveragePerformance = true;

  groundModel = new WFCModel().learn(IMAGES.GROUND, this.N, this.profileLearning, this.printPatterns);
  //structsModel = new WFCModel().learn(IMAGES.STRUCTURES, this.N, this.profileLearning, this.printPatterns);

  generator = {
    house: (region) => generateHouse({width: region.width, height: region.height}),
    path: (region) => console.log("TODO: link path generator", region),
    fence: (region) => console.log("TODO: link fence generator", region),
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

    this.colorBlock("tiny_town");

    if(this.printPatterns) this.displayPatterns(this.metaModel.patterns, "colorTiles");
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
    /*
    const phaser = document.getElementById("phaser");
    const instructions = document.createElement("section");
    instructions.innerHTML = `
      <h2>Controls</h2>
      <p>
        (Opening the console is recommended) <br><br>
        Generate: G <br>
        Clear generation: C <br>
        Get average generation duration over ${this.numRuns} runs: A
      </p>
    `;
    phaser.append(instructions);
    */
    const phaser = document.getElementById("phaser");
    const instructions = document.createElement("section");
    instructions.innerHTML = `
      <h2 class="title is-4">Controls</h2>

      <div class="buttons mt-3">
        <button id="generateBtn" class="button is-primary">Generate</button>
        <button id="clearBtn" class="button is-warning">Clear</button>
        <span id="overlay">
          <input id="overlay-toggle"
            type="checkbox" 
            class="onoffswitch-checkbox"  
            checked="false"
            disabled
          />
          Toggle overlay
        </span>
      </div>
      
      <div class="field">
        <h3 class="title is-5">Get Average Duration</h3>
        <label class="label">Number of Runs</label>
        <div class="control">
          <input id="numRunsInput" class="input" type="number" min="1" value="${this.numRuns}">
        </div>
        <button id="averageBtn" class="button is-info">Generate</button>
      </div>

      <div id="progressWrapper"></div>

      <div id="thinking-icon" class="spinner" style="display: none;"></div>

      <div id="profileMessage"></div>
    `;
    phaser.append(instructions);

    const progressWrapper = document.getElementById("progressWrapper");
    progressWrapper.style.marginTop = "1rem"; 
    progressWrapper.style.marginBottom = "1rem"; 
    progressWrapper.innerHTML = `
      <progress id="progressBar" class="progress is-info" value="0" max="100">0%</progress>
    `;

    /* GENERATE */
    document.getElementById("generateBtn").addEventListener("click", async () => 
      runWithSpinner(async () => await this.getAverageGenerationDuration(1, this.printAveragePerformance))
    );
    
    /* CLEAR */
    document.getElementById("clearBtn").addEventListener("click", () => this.clearMap());
    
    /* COLOR BLOCK */
    this.overlayToggle = document.getElementById('overlay-toggle');
    this.overlayToggle.addEventListener("click", () => {
      if(this.colorblockGFX) this.colorblockGFX.setVisible(this.overlayToggle.checked);
      if(this.metaTileLayer) this.metaTileLayer.setVisible(this.overlayToggle.checked);
    });

    /* GET AVERAGE */
    document.getElementById("numRunsInput").addEventListener("change", (e) => {
      this.numRuns = parseInt(e.target.value);
    });
    document.getElementById("averageBtn").addEventListener("click", async () => 
      runWithSpinner(async () => await this.getAverageGenerationDuration(this.numRuns, this.printAveragePerformance))
    );

    /* LEGACY KEYS */
    this.runWFC_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.clear_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.timedRuns_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    this.runWFC_Key.on("down", () => 
      runWithSpinner(async () => await this.getAverageGenerationDuration(1, this.printAveragePerformance))
    );
    this.clear_Key.on("down", () => this.clearMap());
    this.timedRuns_Key.on("down", async () => 
      await this.getAverageGenerationDuration(this.numRuns, this.printAveragePerformance)
    );
  }

  generateMetaMap(profile = false){
    console.log("Using model for meta tiles");
    const metaImage = this.metaModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!metaImage) return;

    const bgImage  = Array.from({ length: this.height }, () => Array(this.width).fill(0));

    this.displayMap(bgImage, metaImage, "colorTiles");
    document.getElementById("thinking-icon").style.display = "none"; // hide

    return metaImage;
  }

  generateMap(profile = false){
    // generate ground
    console.log("Using model for ground");
    const groundImage = this.groundModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!groundImage) return;

    // generate a meta map (layout) 
    let metaImage = this.generateMetaMap(profile);

    // return performance profiles for models used
    if(profile){
      // parse generated layout
      let wfcLayout = new Layout(
        metaImage,
        this.minStructreSize, 
        STRUCTURE_TILES["color_blocks"]
      );

      const tilemapImage = this.generateTilemap(wfcLayout);

      this.displayMap(groundImage, tilemapImage, "tilemap");

      return {
        metaTiles: this.metaModel.performanceProfile,
      }
    }
  }

  generateTilemap(layout){
    let tilemapImage = Array.from({ length: this.height }, () => Array(this.width).fill(-1)); // empty map
      
    // generate all structures in layout
    for(let structure of layout.worldFacts){
      let region = structure.boundingBox;
      const gen = this.generator[structure.type](region);

      if(!gen) continue;

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

  displayMap(groundImage, structuresImage, tilesetName) {
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

    let tileset = this.structuresMap.addTilesetImage("tileset", tilesetName, 16, 16, 0, 0, 1);
    
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

  async getAverageGenerationDuration(numRuns, print) {
    let profiles = [];
    const progressBar = document.getElementById("progressBar");

    for (let i = 0; i < numRuns; i++) {
      let profile = this.generateMap(true);
      profiles.push(profile);

      // update progress bar
      progressBar.value = ((i + 1) / numRuns) * 100;
      await new Promise(resolve => setTimeout(resolve, 10)); // tweak delay as needed
    }

    let avg = this.sumAllProfiles(profiles);

    for (const [modelName, modelProfile] of Object.entries(avg)) {
      for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
        avg[modelName][funcName] = (avg[modelName][funcName] / numRuns).toFixed(2);  
      }
    }

    if(print){ 
      const outputElement = document.getElementById("profileMessage");
      const message = this.printProfile(avg, numRuns);
      
      outputElement.innerHTML = message.replace(/\n/g, '<br>');
      console.log(this.printProfile(avg, numRuns));
    }
    // console.log(avg);

    progressBar.value = 0;
  }

  sumAllProfiles(profiles) {
    let sum = {};
    for(let profile of profiles){
      for (const [modelName, modelProfile] of Object.entries(profile)) {
        if(!sum[modelName]) sum[modelName] = {};
        for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
          let runningTotal = sum[modelName][funcName] ?? 0;
          runningTotal += functionPerformance;
          sum[modelName][funcName] = runningTotal;
        }
      }
    }

    return sum;
  }

  printProfile(averages, numRuns = 1){
    let message = `==========================================\n`;
    message += `Average performance over ${numRuns} runs:\n`;
    for (const [modelName, modelProfile] of Object.entries(averages)) {
      message += `\n=== ${modelName.toUpperCase()} MODEL ===\n`;
      for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
        let val = averages[modelName][funcName];  
        message += `${funcName}: ${val} ms\n`;
      }
    }
    message += `\n==========================================`;
    return message;
  }

  clearMap(){
    for (const layer of this.multiLayerMapLayers) layer.setVisible(true);
    if (this.groundMap) this.groundMap.destroy();
    if (this.structuresMap) this.structuresMap.destroy();
  }

  colorBlock(id){
    // init layouts array with default input image
    let layouts = [
      new Layout(
        {layers: this.multiLayerMapLayers}, 
        this.minStructreSize, 
        STRUCTURE_TILES[id]
      ).getLayoutMap(),
    ];

    let metaInputIndex = 0;
    this.makeMetaTileLayer(layouts[metaInputIndex], "colorTiles"); // display color blocked default input image 

    this.metaMapSwitch_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.metaMapSwitch_Key.on("down", () => {
      metaInputIndex++;
      if(metaInputIndex === layouts.length) metaInputIndex = 0;
      this.makeMetaTileLayer(layouts[metaInputIndex], "colorTiles");
    });

    // add more inputs
    for(let structureMap of IMAGES.STRUCTURES){
      layouts.push(
        new Layout(
          structureMap,
          this.minStructreSize, 
          STRUCTURE_TILES[id]
        ).getLayoutMap()
      )
    }

    this.metaModel = new WFCModel().learn(layouts, this.N, this.profileLearning, this.printPatterns);

    this.overlayToggle.disabled = false;
  }

  // TEMP: just copied the logic here from Demo_Sketch.js for now
  // TODO: refactor this function into a global util
  // visualizer/debug
  fillTiles(layoutData) {
    const COLORS = [
      "#0f0f0f",
      "#f54242",
      "#009632",
      "#0000ff",
      "#f5c842",
    ];

    // init colorblock gfx with black bg
    this.colorblockGFX = this.add.graphics();
    this.colorblockGFX.fillStyle("0x000000", 1);
    this.colorblockGFX.fillRect(
      0, 0, this.width * this.tileSize, this.height * this.tileSize
    );

    for(let structure of layoutData){
      let color = COLORS[structure.color];
      color = color.replace(/\#/g, "0x"); // make hex-formatted color readable for phaser
      this.colorblockGFX.fillStyle(color);

      // data should have all coords to be filled as an array of {x, y}
      if (structure.trace) {
        let data = structure.trace;

        for (let i = 0; i < data.length; i++) {
          let { x, y } = data[i];
          this.colorblockGFX.fillRect(this.tileSize * x, this.tileSize * y, this.tileSize, this.tileSize);
        }
      } else {
        let data = structure.boundingBox;
        this.colorblockGFX.fillRect(
          data.topLeft.x * this.tileSize, 
          data.topLeft.y * this.tileSize, 
          data.width  * this.tileSize, 
          data.height * this.tileSize
        );
      }
    }
  }

  makeMetaTileLayer(layoutMap, tilesetName){
    if(this.metaMap) this.metaMap.destroy();

    this.metaMap = this.make.tilemap({
      data: layoutMap,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    let tiles = this.metaMap.addTilesetImage("colors", tilesetName);
    this.metaTileLayer = this.metaMap.createLayer(0, tiles, 0, 0);
  }

}

async function runWithSpinner(task) {
  const spinner = document.getElementById("thinking-icon");
  spinner.style.display = "inline-block";

  setTimeout(() => {
    task();
    spinner.style.display = "none";
  }, 1);
}