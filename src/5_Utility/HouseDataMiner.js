// Used to extract the tile ID matrices from a house tilemap's layers.

import Phaser from "../../lib/PhaserModule.js";



//====================================================================================================
//  ENTER DATA HERE:
const fileName = "house26.tmj";
//====================================================================================================



export default class HouseDataMiner extends Phaser.Scene {
  constructor() {
    super("HouseDataMinerScene");
  }

  preload() {
    this.load.setPath("../../assets/");
    this.load.image("tilemapImage", "tinyTown_Tilemap_Packed.png");
    this.load.tilemapTiledJSON("tilemapJSON", `houses/${fileName}`);
  }

  async create()
  {
    await this.getTilemapData();
    this.createTilemap();
    this.displayTilemap();
    this.getMatrices();
    for (const matrix of this.matrices) this.printMatrix(matrix);
    this.setupControls();
  }

  async getTilemapData() {
    // modified code from "Top-level function" section from here: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON

    const response = await fetch(`../../assets/houses/${fileName}`);
    if (!response.ok) throw new Error("There was an error with fetching the tilemap file.");

    const tilemap = await response.json();

    this.width = tilemap.width;
    this.height = tilemap.height;
    this.tilesetName = tilemap.tilesets[0].name;
    this.layerNames = tilemap.layers.map(layer => layer.name);
  }

  createTilemap() {
    this.tilemap = this.add.tilemap("tilemapJSON", 16, 16, this.width, this.height);
    this.tileset = this.tilemap.addTilesetImage(this.tilesetName, "tilemapImage");
    this.layers = this.layerNames.map(name => this.tilemap.createLayer(name, this.tileset));

  }

  displayTilemap() {
    this.currentLayerIndex = 0;
    for (let i = 1; i < this.layers.length; i++) this.layers[i].setVisible(false);
  }

  getMatrices() {
    this.matrices = this.layers.map(layer => this.createMatrixOfNeg1s(this.width, this.height));

    for (let i = 0; i < this.layers.length; i++) {
      for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const layer = this.layers[i];
        const tileId = layer.layer.data[y][x].index;
        this.matrices[i][y][x] = tileId;
      }}
    }
  }

  createMatrixOfNeg1s(width, height) {
    const matrix = [];
    for (let y = 0; y < height; y++) {
      matrix[y] = [];
      for (let x = 0; x < width; x++) {
        matrix[y][x] = -1;
      }
    }
    return matrix;
  }

  printMatrix(matrix) {
    let result = "[\n";
    for (const row of matrix) {
      result += "\t[";
      for (const id of row) {
        result += id + ",";
      }
      result += "-1,],\n";
    }
    result += "\t[";
    for (let i = 0; i < matrix[0].length + 1; i++) {
      result += "-1,";
    }
    result += "],\n";
    result += "],";
    console.log(result);
  }

  setupControls() {
    this.prevLayer_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.nextLayer_Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    this.prevLayer_Key.on("down", () => this.changeLayer(-1));
    this.nextLayer_Key.on("down", () => this.changeLayer(1));

    document.getElementById("instructions").innerHTML = `
      <h2>Controls</h2>
      Change Layer: UP/DOWN
    `;
  }

  changeLayer(di) {
    const [i, len] = [this.currentLayerIndex, this.layers.length];
    this.currentLayerIndex = (i + di + (di<0 ? len : 0)) % len;
    for (const layer of this.layers) layer.setVisible(false);
    this.layers[this.currentLayerIndex].setVisible(true);
  }
}