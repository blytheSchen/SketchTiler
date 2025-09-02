// Used to extract the tile ID matrices from a fence tilemap's layers.

import Phaser from "../../lib/phaserModule.js";



//====================================================================================================
//  ENTER DATA HERE:
const firstFence = 1; // inclusive
const lastFence = 1; // inclusive
//====================================================================================================



export default class FenceDataMiner extends Phaser.Scene {
  constructor() {
    super("FenceDataMinerScene");
  }

  create()
  {
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on("down", () => this.run());
    document.getElementById("instructions").innerHTML = "Run: R";
  }

  async run() {
    // learning source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON
    // also ChatGPT

    let str = "[\n";

    for (let i = firstFence; i <= lastFence; i++) {
      const response = await fetch(`../../assets/fences/fence${i}.tmj`);
      if (!response.ok) throw new Error(`There was an error with fetching fence${i}.tmj.`);

      let json;
      try {
        json = await response.json();
      } catch {
        throw new Error(`There is a problem with the contents of fence${i}.tmj.`);
      }

      str += `\t// fence ${i}\n`;

      for (const layer of json.layers) {
        const matrix = this.createMatrixFromArray(layer.width, layer.height, layer.data);
        this.addPadding(matrix);
        str += this.matrixToStr(matrix, `\t// ${layer.name}`);
      }

      str += '\n';
    }

    str += "];";

    console.log(str);
  }

  createMatrixFromArray(width, height, array) {
    const matrix = this.createMatrix(width, height);

    for (let i = 0; i < array.length; i++) {
      const y = Math.floor(i / width);
      const x = i % width;
      matrix[y][x] = array[i];
    }

    return matrix
  }

  createMatrix(width, height) {
    const matrix = [];

    for (let y = 0; y < height; y++) {
      matrix[y] = [];
      for (let x = 0; x < width; x++) {
        matrix[y][x] = undefined;
      }
    }

    return matrix;
  }

  addPadding(matrix) {
    for (const row of matrix) row.push(-1);
    matrix.push(Array(matrix[0].length).fill(-1));
  }

  matrixToStr(matrix, comment) {
    let str = `\t[${comment}\n`;
    
    for (const row of matrix) {
      str += "\t\t["
      for (const elem of row) str += `${elem},`;
      str += "],\n";
    }

    str += "\t],\n";

    return str;
  }
}