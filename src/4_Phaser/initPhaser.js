import Phaser from "../../lib/phaserModule.js";
import TILEMAP from "./3_Utils/tilemap.js";
import Autotiler from "./1_App/Autotiler.js";

//import Sketch from "./2_Demos/Sketch.js";
//import WFC from "./2_Demos/WFC.js";

// import HouseDataMiner from "../5_Utility/HouseDataMiner.js";
// import HouseDataMiner2 from "../5_Utility/HouseDataMiner2.js";
// import TilemapDataMiner from "../5_Utility/tilemapDataMiner.js";
import DataMiner from "../5_Utility/DataMiner.js";

const tilesetInfo = TILEMAP["tiny_town"];

const dataMiner = new DataMiner();
const updateInputButton = document.getElementById("update-input-button");
updateInputButton.addEventListener("click", async () => dataMiner.run());
updateInputButton.style.visibility = "hidden";

export default function initPhaser() {
  window.game = new Phaser.Game({
    parent: "phaser",
    type: Phaser.CANVAS,
    width: tilesetInfo.WIDTH * tilesetInfo.TILE_WIDTH,
    height: tilesetInfo.HEIGHT * tilesetInfo.TILE_WIDTH,
    zoom: 1,
    //autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    //backgroundColor: "#ebebeb",
    render: { pixelArt: true },	// scale pixel art without blurring
    scene: [Autotiler]
  });
}