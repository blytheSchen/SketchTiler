/**
 * @fileoverview
 * Initializes and sizes the sketchpad, grid canvas, and sketch canvas
 * based on the current TILEMAP configuration. Also renders a visual grid overlay.
 */

import TILEMAP from "../4_Phaser/3_Utils/tilemap.js";
import "./sketchpad.js"; // so the file is executed

const tilesetInfo = TILEMAP["tiny_town"];

/**
 * Initializes the sketchpad dimensions and rendering settings.
 * Sets canvas sizes based on TILEMAP settings and draws a grid overlay.
 */
export default function initSketchpad() {
  const width = tilesetInfo.WIDTH * tilesetInfo.TILE_WIDTH;
  const height = tilesetInfo.HEIGHT * tilesetInfo.TILE_WIDTH;

  const sketchpad = document.getElementById("sketchpad");
  sketchpad.style.width = `${width}px`;
  sketchpad.style.height = `${height}px`;

  const gridCanvas = document.getElementById("grid-canvas");
  gridCanvas.width = width;
  gridCanvas.height = height;
  drawGrid(gridCanvas);

  const sketchCanvas = document.getElementById("sketch-canvas");
  sketchCanvas.width = width;
  sketchCanvas.height = height;
  sketchCanvas.getContext("2d").font = "30px serif";
}

/**
 * Draws a uniform grid on `canvas`.
 * Each grid cell has the same dimensions as a tilemap tile.
 * @param {HTMLElement} canvas
 */
function drawGrid(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#DBDBDB";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += tilesetInfo.TILE_WIDTH) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += tilesetInfo.TILE_WIDTH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}
