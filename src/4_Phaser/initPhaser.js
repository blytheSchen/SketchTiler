import Phaser from "../../lib/phaserModule.js";
import TILEMAP from "./TILEMAP.js";
import Autotiler from "./Autotiler.js";

//import Sketch from "./1_Demos/Sketch.js";
//import WFC from "./1_Demos/WFC.js";

// import HouseDataMiner from "../5_Utility/HouseDataMiner.js";
// import HouseDataMiner2 from "../5_Utility/HouseDataMiner2.js";
// import TilemapDataMiner from "../5_Utility/TilemapDataMiner.js";

export default function initPhaser() {
  window.game = new Phaser.Game({
    parent: "phaser",
    type: Phaser.CANVAS,
    width: TILEMAP.WIDTH * TILEMAP.TILE_WIDTH,
    height: TILEMAP.HEIGHT * TILEMAP.TILE_WIDTH,
    zoom: 1,
    //autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    //backgroundColor: "#ebebeb",
    render: { pixelArt: true },	// scale pixel art without blurring
    scene: [Autotiler]
  });
}