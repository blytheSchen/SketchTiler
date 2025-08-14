import Phaser from "../../lib/phaserModule.js";
import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import generateHouse from "../3_Generators/generateHouse.js";

// hide sketchpad elements
document.getElementById("sketchpad").classList.add("hidden");
document.getElementById("buttons").classList.add("hidden");
document.getElementById("instructions").classList.add("hidden");

export default class Demo_WFC extends Phaser.Scene {
  displayedMapID = 3;	// check assets folder to see all maps  

  N = 2;
  profileLearning = false;

  // width & height for entire maps should have an 8:5 ratio (e.g. 24x15, 40x25)
  width = 40;
  height = 25;
  maxAttempts = 10;
  logProgress = true;
  profileSolving = true;
  logProfile = false;

  numRuns = 100;	// for this.getAverageGenerationDuration()
  printAveragePerformance = true;

  groundModel = new WFCModel().learn(IMAGES.GROUND, this.N, this.profileLearning);
  structuresModel = new WFCModel().learn(IMAGES.STRUCTURES, this.N, this.profileLearning);

  constructor() {
    super("wfcTestingScene");
  }

  preload() {
    this.load.setPath("./assets/");
    this.load.image("tilemap", "tinyTown_Tilemap_Packed.png");
    this.load.tilemapTiledJSON("tinyTownMap", `maps/map${this.displayedMapID}.tmj`);
  }

  create() {
    this.showInputImage();
    this.setupControls();
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

    document.getElementById("numRunsInput").addEventListener("change", (e) => {
      this.numRuns = parseInt(e.target.value);
    });

    document.getElementById("generateBtn").addEventListener("click", async () => 
      runWithSpinner(async () => await this.getAverageGenerationDuration(1, this.printAveragePerformance))
    );
    document.getElementById("clearBtn").addEventListener("click", () => this.clearMap());
    document.getElementById("averageBtn").addEventListener("click", async () => 
      runWithSpinner(async () => await this.getAverageGenerationDuration(this.numRuns, this.printAveragePerformance))
    );

    // legacy keys
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

  generateMap(profile = false){
    console.log("Using model for ground");
    const groundImage = this.groundModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!groundImage) return;

    console.log("Using model for structures");
    const structuresImage = this.structuresModel.generate(this.width, this.height, this.maxAttempts, this.logProgress, this.profileSolving, this.logProfile);
    if (!structuresImage) return;
    
    /*
    console.log("Using house generator");
    const structuresImage = generateHouse({
      topLeft: { x: 0, y: 0 },
      bottomRight: { x: this.width-1, y: this.height-1 },
      width: this.width,
      height: this.height
    });
    if (!structuresImage) return;
    */

    this.displayMap(groundImage, structuresImage);
    document.getElementById("thinking-icon").style.display = "none";        // hide

    // return performance profiles for models used
    if(profile){
      return {
        ground: this.groundModel.performanceProfile,
        structs: this.structuresModel.performanceProfile,
      }
    }
  }

  displayMap(groundImage, structuresImage) {
    if (this.groundMap) this.groundMap.destroy();
    if (this.structuresMap) this.structuresMap.destroy();

    this.groundMap = this.make.tilemap({
      data: groundImage,
      tileWidth: 16,
      tileHeight: 16
    });
    this.structuresMap = this.make.tilemap({
      data: structuresImage,
      tileWidth: 16,
      tileHeight: 16
    });
    
    this.groundMap.createLayer(0, this.tileset, 0, 0);
    this.structuresMap.createLayer(0, this.tileset, 0, 0);

    for (const layer of this.multiLayerMapLayers) layer.setVisible(false);
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
}

async function runWithSpinner(task) {
  const spinner = document.getElementById("thinking-icon");
  spinner.style.display = "inline-block";

  setTimeout(() => {
    task();
    spinner.style.display = "none";
  }, 1);
}