// Used to extract the tile ID matrices from a house tilemap's layers.

import Phaser from "../../lib/PhaserModule.js";



//====================================================================================================
//  ENTER DATA HERE:
const firstHouse = 1; // inclusive
const lastHouse = 42; // inclusive
//====================================================================================================



export default class HouseDataMiner2 extends Phaser.Scene {
  constructor() {
    super("HouseDataMiner2Scene");
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

    for (let i = firstHouse; i <= lastHouse; i++) {
      const response = await fetch(`../../assets/houses/house${i}.tmj`);
      if (!response.ok) throw new Error(`There was an error with fetching house${i}.tmj.`);

      let json;
      try {
        json = await response.json();
      } catch {
        throw new Error(`There is a problem with the contents of house${i}.tmj.`);
      }

      str += `\t// house ${i}\n`;

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