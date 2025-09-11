// Used to extract the tile ID matrices from a tilemap's layers.

import Phaser from "../../lib/phaserModule.js";


//====================================================================================================
//  ENTER DATA HERE:
const key = "path";
const first = 1; // inclusive
const last = 3; // inclusive
//====================================================================================================



export default class DataMiner extends Phaser.Scene {
  constructor() {
    super("DataMinerScene");
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

    for (let i = first; i <= last; i++) {
      const response = await fetch(`../../assets/${key}s/${key}${i}.tmj`);
      if (!response.ok) throw new Error(`There was an error with fetching ${key}${i}.tmj.`);

      let json;
      try {
        json = await response.json();
      } catch {
        throw new Error(`There is a problem with the contents of ${key}${i}.tmj.`);
      }

      str += `\t// ${key} ${i}\n`;

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